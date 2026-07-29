import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAX_QUOTES,
  MAX_WAVES,
  WAVE_SIZE,
  fulfilmentModeFor,
  offerWindowSeconds,
} from "./dispatch-config";

type Admin = SupabaseClient<any, "public", any>;

export async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Admin;
}

type BookingRow = {
  id: string;
  category: string;
  address: string;
  budget: number | null;
  price: number | null;
  scheduled_for: string | null;
  provider_id: string | null;
  dispatch_wave: number;
  fulfilment_mode: string;
  dispatch_state: string;
  status: string;
};

/**
 * Ranked shortlist for a wave. Providers the client already distance-ranked come
 * first; everything else is ordered by rating, then completed jobs.
 */
export async function pickWaveProviders(
  db: Admin,
  booking: BookingRow,
  wave: number,
  rankedProviderIds: string[],
) {
  const { data, error } = await db
    .from("providers")
    .select("id, user_id, rating_avg, jobs_completed, available")
    .eq("category", booking.category)
    .eq("verification_status", "approved")
    .order("rating_avg", { ascending: false })
    .order("jobs_completed", { ascending: false });
  if (error) throw new Error(error.message);

  const all = data ?? [];
  // Wave 1-2 stay with providers that are online; later waves widen to everyone.
  const pool = wave <= 2 ? all.filter((p) => p.available) : all;
  const rank = new Map(rankedProviderIds.map((id, i) => [id, i]));
  const sorted = [...pool].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id)! : Number.MAX_SAFE_INTEGER;
    const rb = rank.has(b.id) ? rank.get(b.id)! : Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });

  const { data: existing } = await db
    .from("job_offers")
    .select("provider_id")
    .eq("booking_id", booking.id);
  const already = new Set((existing ?? []).map((o: any) => o.provider_id));

  return sorted.filter((p) => !already.has(p.id)).slice(0, WAVE_SIZE);
}

export async function createOffers(db: Admin, booking: BookingRow, wave: number, rankedProviderIds: string[]) {
  const picks = await pickWaveProviders(db, booking, wave, rankedProviderIds);
  if (picks.length === 0) return 0;

  const expiresAt = new Date(Date.now() + offerWindowSeconds(booking.category) * 1000).toISOString();
  const { error } = await db.from("job_offers").insert(
    picks.map((p) => ({
      booking_id: booking.id,
      provider_id: p.id,
      provider_user_id: p.user_id,
      wave,
      expires_at: expiresAt,
      status: "offered",
    })),
  );
  if (error) throw new Error(error.message);

  const mode = fulfilmentModeFor(booking.category);
  const amount = booking.budget ?? booking.price;
  await db.from("notifications").insert(
    picks.map((p) => ({
      user_id: p.user_id,
      title: mode === "quotes" ? `Quote request — ${booking.category}` : `New ${booking.category} job`,
      body: [
        booking.address,
        amount ? `Budget $${Number(amount).toFixed(2)}` : null,
        booking.scheduled_for ? new Date(booking.scheduled_for).toLocaleString() : "ASAP",
      ]
        .filter(Boolean)
        .join(" · "),
      link: "/provider",
      kind: mode === "quotes" ? "job_quote_request" : "job_offer",
    })),
  );
  return picks.length;
}

/** Marks elapsed offers as expired. */
export async function expireOffers(db: Admin, bookingId: string) {
  await db
    .from("job_offers")
    .update({ status: "expired" })
    .eq("booking_id", bookingId)
    .eq("status", "offered")
    .lt("expires_at", new Date().toISOString());
}

/**
 * Moves the job to the next wave when the current one produced nothing.
 * Safe to call repeatedly from the client while a job is dispatching.
 */
export async function advance(db: Admin, bookingId: string, rankedProviderIds: string[] = []) {
  const { data: booking, error } = await db.from("bookings").select("*").eq("id", bookingId).single();
  if (error) throw new Error(error.message);
  const b = booking as BookingRow;

  if (b.provider_id || b.status === "cancelled" || b.dispatch_state === "assigned") {
    return { state: b.dispatch_state, wave: b.dispatch_wave };
  }

  await expireOffers(db, bookingId);

  const { data: live } = await db
    .from("job_offers")
    .select("id, status")
    .eq("booking_id", bookingId)
    .eq("status", "offered");
  if ((live ?? []).length > 0) return { state: b.dispatch_state, wave: b.dispatch_wave };

  if (b.fulfilment_mode === "quotes") {
    const { count } = await db
      .from("job_quotes")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", bookingId)
      .eq("status", "submitted");
    if ((count ?? 0) >= MAX_QUOTES) return { state: "collecting_quotes", wave: b.dispatch_wave };
  }

  const nextWave = b.dispatch_wave + 1;
  if (nextWave > MAX_WAVES) {
    const finalState = b.fulfilment_mode === "quotes" ? "collecting_quotes" : "no_providers";
    await db
      .from("bookings")
      .update({ dispatch_state: finalState, dispatch_updated_at: new Date().toISOString() })
      .eq("id", bookingId);
    return { state: finalState, wave: b.dispatch_wave };
  }

  const created = await createOffers(db, b, nextWave, rankedProviderIds);
  if (created === 0) {
    const finalState = b.fulfilment_mode === "quotes" ? "collecting_quotes" : "no_providers";
    await db
      .from("bookings")
      .update({ dispatch_state: finalState, dispatch_updated_at: new Date().toISOString() })
      .eq("id", bookingId);
    return { state: finalState, wave: b.dispatch_wave };
  }

  await db
    .from("bookings")
    .update({
      dispatch_wave: nextWave,
      dispatch_radius_km: 10 * nextWave,
      dispatch_updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);
  return { state: b.dispatch_state, wave: nextWave };
}

/** Race-safe assignment: only the first provider to accept wins. */
export async function claimJob(db: Admin, offerId: string, userId: string) {
  const { data: offer, error } = await db
    .from("job_offers")
    .select("*, bookings(id, status, provider_id, category)")
    .eq("id", offerId)
    .eq("provider_user_id", userId)
    .single();
  if (error || !offer) throw new Error("Offer not found");
  if (offer.status !== "offered") return { won: false, reason: "This job is no longer available." };
  if (new Date(offer.expires_at).getTime() < Date.now()) {
    await db.from("job_offers").update({ status: "expired" }).eq("id", offerId);
    return { won: false, reason: "The offer window closed." };
  }

  const { data: claimed } = await db
    .from("bookings")
    .update({
      provider_id: offer.provider_id,
      status: "accepted",
      dispatch_state: "assigned",
      dispatch_updated_at: new Date().toISOString(),
    })
    .eq("id", offer.booking_id)
    .is("provider_id", null)
    .eq("status", "pending")
    .select("id, customer_id, category")
    .maybeSingle();

  if (!claimed) {
    await db
      .from("job_offers")
      .update({ status: "lost", responded_at: new Date().toISOString() })
      .eq("id", offerId);
    return { won: false, reason: "Another provider accepted first." };
  }

  await db
    .from("job_offers")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", offerId);
  await db
    .from("job_offers")
    .update({ status: "lost" })
    .eq("booking_id", offer.booking_id)
    .neq("id", offerId)
    .in("status", ["offered", "expired"]);

  await db.from("notifications").insert({
    user_id: claimed.customer_id,
    title: "Provider assigned",
    body: `A verified ${claimed.category} provider accepted your job.`,
    link: `/bookings/${claimed.id}`,
    kind: "booking_accepted",
  });

  return { won: true, bookingId: offer.booking_id };
}

export async function declineOffer(db: Admin, offerId: string, userId: string) {
  const { error } = await db
    .from("job_offers")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("provider_user_id", userId)
    .eq("status", "offered");
  if (error) throw new Error(error.message);
  return { ok: true };
}
