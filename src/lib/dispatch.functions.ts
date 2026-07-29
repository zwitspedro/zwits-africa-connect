import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateJobSchema = z.object({
  category: z.string().min(1).max(60),
  address: z.string().min(3).max(300),
  description: z.string().max(2000).optional().nullable(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  scheduledFor: z.string().nullable().optional(),
  budget: z.number().min(0).max(100000).nullable().optional(),
  price: z.number().min(0).max(100000).nullable().optional(),
  photos: z.array(z.string().min(1).max(400)).max(6).default([]),
  paymentMethod: z.string().max(30).default("cash"),
  preferredProviderId: z.string().uuid().nullable().optional(),
  rankedProviderIds: z.array(z.string().uuid()).max(200).default([]),
});

export const createJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateJobSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { admin, createOffers } = await import("./dispatch.server");
    const { fulfilmentModeFor } = await import("./dispatch-config");
    const db = await admin();

    const mode = data.preferredProviderId ? "direct" : fulfilmentModeFor(data.category);
    const dispatchState = data.preferredProviderId
      ? "assigned"
      : mode === "quotes"
        ? "collecting_quotes"
        : "dispatching";

    const { data: booking, error } = await db
      .from("bookings")
      .insert({
        customer_id: context.userId,
        provider_id: data.preferredProviderId ?? null,
        category: data.category,
        address: data.address,
        description: data.description ?? null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        scheduled_for: data.scheduledFor ?? null,
        budget: data.budget ?? null,
        price: data.price ?? null,
        photos: data.photos,
        payment_method: data.paymentMethod,
        payment_status: "pending",
        fulfilment_mode: mode,
        dispatch_state: dispatchState,
        dispatch_wave: 1,
        dispatch_updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    let offered = 0;
    if (!data.preferredProviderId) {
      offered = await createOffers(db, booking as any, 1, data.rankedProviderIds);
      if (offered === 0) {
        await db
          .from("bookings")
          .update({ dispatch_state: mode === "quotes" ? "collecting_quotes" : "no_providers" })
          .eq("id", booking.id);
      }
    }

    return { id: booking.id as string, createdAt: booking.created_at as string, mode, offered };
  });

export const advanceDispatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ bookingId: z.string().uuid(), rankedProviderIds: z.array(z.string().uuid()).max(200).default([]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { admin, advance } = await import("./dispatch.server");
    const db = await admin();
    const { data: owned } = await db
      .from("bookings")
      .select("id")
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId)
      .maybeSingle();
    if (!owned) throw new Error("Forbidden");
    return advance(db, data.bookingId, data.rankedProviderIds);
  });

export const respondToOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ offerId: z.string().uuid(), action: z.enum(["accept", "decline"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { admin, claimJob, declineOffer } = await import("./dispatch.server");
    const db = await admin();
    if (data.action === "decline") return { won: false, declined: true, ...(await declineOffer(db, data.offerId, context.userId)) };
    return claimJob(db, data.offerId, context.userId);
  });

export const submitQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        offerId: z.string().uuid(),
        price: z.number().min(1).max(100000),
        etaMinutes: z.number().int().min(5).max(10080),
        message: z.string().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { admin } = await import("./dispatch.server");
    const { MAX_QUOTES } = await import("./dispatch-config");
    const db = await admin();

    const { data: offer } = await db
      .from("job_offers")
      .select("*")
      .eq("id", data.offerId)
      .eq("provider_user_id", context.userId)
      .maybeSingle();
    if (!offer) throw new Error("Offer not found");

    const { count } = await db
      .from("job_quotes")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", offer.booking_id)
      .eq("status", "submitted");
    if ((count ?? 0) >= MAX_QUOTES) throw new Error("This job already has the maximum number of quotes.");

    const { error } = await db.from("job_quotes").upsert(
      {
        booking_id: offer.booking_id,
        provider_id: offer.provider_id,
        provider_user_id: context.userId,
        price: data.price,
        eta_minutes: data.etaMinutes,
        message: data.message ?? null,
        status: "submitted",
      },
      { onConflict: "booking_id,provider_id" },
    );
    if (error) throw new Error(error.message);

    await db
      .from("job_offers")
      .update({ status: "quoted", responded_at: new Date().toISOString() })
      .eq("id", data.offerId);

    const { data: booking } = await db
      .from("bookings")
      .select("id, customer_id, category")
      .eq("id", offer.booking_id)
      .single();
    if (booking) {
      await db.from("notifications").insert({
        user_id: booking.customer_id,
        title: "New quote received",
        body: `A provider quoted $${data.price.toFixed(2)} for your ${booking.category} job.`,
        link: `/bookings/${booking.id}`,
        kind: "job_quote",
      });
    }
    return { ok: true };
  });

export const acceptQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ quoteId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin } = await import("./dispatch.server");
    const db = await admin();

    const { data: quote } = await db.from("job_quotes").select("*").eq("id", data.quoteId).maybeSingle();
    if (!quote) throw new Error("Quote not found");

    const { data: claimed } = await db
      .from("bookings")
      .update({
        provider_id: quote.provider_id,
        price: quote.price,
        status: "accepted",
        dispatch_state: "assigned",
        dispatch_updated_at: new Date().toISOString(),
      })
      .eq("id", quote.booking_id)
      .eq("customer_id", context.userId)
      .is("provider_id", null)
      .select("id, category")
      .maybeSingle();
    if (!claimed) throw new Error("This job already has a provider.");

    await db.from("job_quotes").update({ status: "accepted" }).eq("id", data.quoteId);
    await db
      .from("job_quotes")
      .update({ status: "rejected" })
      .eq("booking_id", quote.booking_id)
      .neq("id", data.quoteId);
    await db
      .from("job_offers")
      .update({ status: "lost" })
      .eq("booking_id", quote.booking_id)
      .in("status", ["offered", "quoted", "expired"]);

    await db.from("notifications").insert({
      user_id: quote.provider_user_id,
      title: "Your quote was accepted",
      body: `You won the ${claimed.category} job at $${Number(quote.price).toFixed(2)}.`,
      link: `/bookings/${claimed.id}`,
      kind: "quote_accepted",
    });
    return { ok: true, bookingId: claimed.id as string };
  });

export const confirmCompletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ bookingId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin } = await import("./dispatch.server");
    const db = await admin();
    const { data: booking } = await db
      .from("bookings")
      .update({ customer_confirmed_at: new Date().toISOString(), payment_status: "paid" })
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId)
      .eq("status", "completed")
      .select("id, provider_id, category")
      .maybeSingle();
    if (!booking) throw new Error("Booking is not ready to confirm.");

    if (booking.provider_id) {
      const { data: provider } = await db
        .from("providers")
        .select("user_id")
        .eq("id", booking.provider_id)
        .maybeSingle();
      if (provider) {
        await db.from("notifications").insert({
          user_id: provider.user_id,
          title: "Payment released",
          body: `The customer confirmed your ${booking.category} job.`,
          link: `/provider`,
          kind: "payment_released",
        });
      }
    }
    return { ok: true };
  });

export const listMyOffers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin } = await import("./dispatch.server");
    const db = await admin();

    const { data: offers, error } = await db
      .from("job_offers")
      .select("id, booking_id, provider_id, wave, status, offered_at, expires_at")
      .eq("provider_user_id", context.userId)
      .in("status", ["offered", "quoted"])
      .order("offered_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    if (!offers?.length) return [];

    const ids = offers.map((o: any) => o.booking_id);
    const { data: bookings } = await db
      .from("bookings")
      .select("id, customer_id, category, description, address, lat, lng, budget, price, scheduled_for, photos, fulfilment_mode, status, provider_id")
      .in("id", ids);
    const byId = new Map((bookings ?? []).map((b: any) => [b.id, b]));

    const customerIds = Array.from(new Set((bookings ?? []).map((b: any) => b.customer_id)));
    const { data: profiles } = await db
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", customerIds.length ? customerIds : ["00000000-0000-0000-0000-000000000000"]);
    const nameById = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name as string | null]));

    return offers
      .map((o: any) => {
        const b: any = byId.get(o.booking_id);
        if (!b || b.status !== "pending" || b.provider_id) return null;
        const full = (nameById.get(b.customer_id) ?? "Customer").trim();
        const first = full.split(" ")[0];
        const initial = full.split(" ")[1]?.[0];
        return {
          offerId: o.id as string,
          status: o.status as string,
          expiresAt: o.expires_at as string,
          wave: o.wave as number,
          booking: {
            id: b.id as string,
            category: b.category as string,
            description: (b.description ?? null) as string | null,
            address: b.address as string,
            budget: b.budget != null ? Number(b.budget) : null,
            price: b.price != null ? Number(b.price) : null,
            scheduledFor: (b.scheduled_for ?? null) as string | null,
            photos: (b.photos ?? []) as string[],
            fulfilmentMode: b.fulfilment_mode as string,
            customerName: initial ? `${first} ${initial}.` : first,
          },
        };
      })
      .filter(Boolean);
  });

export const signJobPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ paths: z.array(z.string().min(1)).max(6) }).parse(input))
  .handler(async ({ data, context }) => {
    if (!data.paths.length) return [] as string[];
    const { supabase, userId } = context;

    // Only sign paths the caller is actually entitled to: their own uploads,
    // photos on bookings visible to them under RLS (customer / assigned
    // provider), or any path when the caller is an admin.
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    let allowed: string[];
    if (isAdmin) {
      allowed = data.paths;
    } else {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("photos")
        .overlaps("photos", data.paths);
      const bookingPaths = new Set<string>();
      for (const b of bookings ?? []) {
        for (const p of (b.photos ?? []) as string[]) bookingPaths.add(p);
      }
      allowed = data.paths.filter(
        (p) => p.split("/")[0] === userId || bookingPaths.has(p),
      );
    }

    if (!allowed.length) return [] as string[];

    const { admin } = await import("./dispatch.server");
    const db = await admin();
    const { data: signed } = await db.storage.from("job-photos").createSignedUrls(allowed, 3600);
    return (signed ?? []).map((s: any) => s.signedUrl as string).filter(Boolean);
  });

