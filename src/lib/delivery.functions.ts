import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateDeliverySchema = z.object({
  serviceTier: z.enum(["express_bike", "standard_van", "business_courier"]),
  parcelSize: z.enum(["small", "medium", "large"]),
  pickupAddress: z.string().min(3).max(300),
  pickupLat: z.number().nullable().optional(),
  pickupLng: z.number().nullable().optional(),
  dropoffAddress: z.string().min(3).max(300),
  dropoffLat: z.number().nullable().optional(),
  dropoffLng: z.number().nullable().optional(),
  recipientName: z.string().max(120).nullable().optional(),
  recipientPhone: z.string().max(40).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  paymentMethod: z.string().max(30).default("cash"),
});

export const createDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateDeliverySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { admin, createDeliveryOffers } = await import("./delivery.server");
    const { quotePrice, haversineKm } = await import("./delivery-config");
    const db = await admin();

    const distance = haversineKm(
      data.pickupLat != null && data.pickupLng != null ? { lat: data.pickupLat, lng: data.pickupLng } : null,
      data.dropoffLat != null && data.dropoffLng != null ? { lat: data.dropoffLat, lng: data.dropoffLng } : null,
    );
    const price = quotePrice(data.serviceTier, data.parcelSize, distance);

    const { data: delivery, error } = await db
      .from("deliveries")
      .insert({
        customer_id: context.userId,
        service_tier: data.serviceTier,
        parcel_size: data.parcelSize,
        pickup_address: data.pickupAddress,
        pickup_lat: data.pickupLat ?? null,
        pickup_lng: data.pickupLng ?? null,
        dropoff_address: data.dropoffAddress,
        dropoff_lat: data.dropoffLat ?? null,
        dropoff_lng: data.dropoffLng ?? null,
        recipient_name: data.recipientName ?? null,
        recipient_phone: data.recipientPhone ?? null,
        notes: data.notes ?? null,
        price,
        distance_km: distance,
        payment_method: data.paymentMethod,
        payment_status: "pending",
        status: "pending",
        dispatch_state: "dispatching",
        dispatch_wave: 1,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const offered = await createDeliveryOffers(db, delivery as any, 1);
    if (offered === 0) {
      await db.from("deliveries").update({ dispatch_state: "no_drivers" }).eq("id", delivery.id);
    }
    return { id: delivery.id as string, price, distanceKm: distance, offered };
  });

/** Live offers for the signed-in driver. */
export const listMyDeliveryOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin, expireDeliveryOffers } = await import("./delivery.server");
    const db = await admin();

    const { data, error } = await db
      .from("delivery_offers")
      .select(
        "id, status, wave, expires_at, delivery_id, deliveries(id, pickup_address, dropoff_address, service_tier, parcel_size, price, distance_km, notes, recipient_name, status, driver_id)",
      )
      .eq("driver_user_id", context.userId)
      .eq("status", "offered")
      .gt("expires_at", new Date().toISOString())
      .order("offered_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);

    const rows = (data ?? []).filter((o: any) => o.deliveries && !o.deliveries.driver_id);
    for (const o of data ?? []) await expireDeliveryOffers(db, (o as any).delivery_id);

    return rows.map((o: any) => ({
      offerId: o.id,
      expiresAt: o.expires_at,
      wave: o.wave,
      delivery: {
        id: o.deliveries.id,
        pickupAddress: o.deliveries.pickup_address,
        dropoffAddress: o.deliveries.dropoff_address,
        serviceTier: o.deliveries.service_tier,
        parcelSize: o.deliveries.parcel_size,
        price: o.deliveries.price,
        distanceKm: o.deliveries.distance_km,
        notes: o.deliveries.notes,
        recipientName: o.deliveries.recipient_name,
      },
    }));
  });

export const respondToDeliveryOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ offerId: z.string().uuid(), action: z.enum(["accept", "decline"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { admin, claimDelivery } = await import("./delivery.server");
    const db = await admin();

    if (data.action === "decline") {
      await db
        .from("delivery_offers")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", data.offerId)
        .eq("driver_user_id", context.userId)
        .eq("status", "offered");
      return { won: false, declined: true };
    }
    return claimDelivery(db, data.offerId, context.userId);
  });

/** Driver moves a delivery along: picked_up → delivered. */
export const updateDeliveryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        deliveryId: z.string().uuid(),
        status: z.enum(["picked_up", "delivered", "cancelled"]),
        proofPhotoUrl: z.string().max(500).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { admin } = await import("./delivery.server");
    const db = await admin();

    const { data: delivery, error } = await db
      .from("deliveries")
      .select("id, customer_id, driver_id, status")
      .eq("id", data.deliveryId)
      .single();
    if (error || !delivery) throw new Error("Delivery not found");

    const isDriver = delivery.driver_id === context.userId;
    const isCustomer = delivery.customer_id === context.userId;
    if (!isDriver && !(isCustomer && data.status === "cancelled")) throw new Error("Not allowed");

    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "picked_up") patch.picked_up_at = new Date().toISOString();
    if (data.status === "delivered") {
      patch.delivered_at = new Date().toISOString();
      patch.payment_status = "paid";
      if (data.proofPhotoUrl) patch.proof_photo_url = data.proofPhotoUrl;
    }

    const { error: upErr } = await db.from("deliveries").update(patch).eq("id", data.deliveryId);
    if (upErr) throw new Error(upErr.message);

    if (data.status === "delivered" && delivery.driver_id) {
      const { data: prof } = await db
        .from("driver_profiles")
        .select("deliveries_completed")
        .eq("user_id", delivery.driver_id)
        .maybeSingle();
      await db
        .from("driver_profiles")
        .update({ deliveries_completed: (prof?.deliveries_completed ?? 0) + 1 })
        .eq("user_id", delivery.driver_id);
    }

    const notifyUser = isDriver ? delivery.customer_id : delivery.driver_id;
    if (notifyUser) {
      const titles: Record<string, string> = {
        picked_up: "Parcel picked up",
        delivered: "Delivered",
        cancelled: "Delivery cancelled",
      };
      await db.from("notifications").insert({
        user_id: notifyUser,
        title: titles[data.status],
        body: `Your delivery is now ${data.status.replace("_", " ")}.`,
        link: `/deliveries/${data.deliveryId}`,
        kind: `delivery_${data.status}`,
      });
    }
    return { ok: true };
  });

/** Nudges dispatch forward while a delivery is still looking for a driver. */
export const advanceDeliveryDispatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ deliveryId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin, advanceDelivery } = await import("./delivery.server");
    const db = await admin();
    const { data: d } = await db
      .from("deliveries")
      .select("customer_id")
      .eq("id", data.deliveryId)
      .maybeSingle();
    if (!d || d.customer_id !== context.userId) throw new Error("Not allowed");
    return advanceDelivery(db, data.deliveryId);
  });
