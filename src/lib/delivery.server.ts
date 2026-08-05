import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_WAVES, OFFER_WINDOW_SECONDS, WAVE_SIZE, haversineKm } from "./delivery-config";

type Admin = SupabaseClient<any, "public", any>;

export async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Admin;
}

/**
 * Delivery-side audit trail, mirroring `logEvent` for bookings.
 * `dedupeKey` makes retries safe: the same milestone is only ever recorded once.
 */
export async function logDeliveryEvent(
  db: Admin,
  deliveryId: string,
  event: string,
  actor: string | null = null,
  metadata: Record<string, unknown> | null = null,
  dedupeKey: string | null = null,
) {
  try {
    await db.rpc("log_delivery_event", {
      _delivery_id: deliveryId,
      _event: event,
      _actor: actor,
      _metadata: metadata as any,
      _dedupe_key: dedupeKey,
    });
  } catch {
    /* auditing must never break the delivery flow */
  }
}

type DeliveryRow = {
  id: string;
  customer_id: string;
  driver_id: string | null;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  price: number | null;
  service_tier: string;
  status: string;
  dispatch_state: string;
  dispatch_wave: number;
};

/** Drivers eligible for a wave: online first, widening on later waves. */
async function pickWaveDrivers(db: Admin, delivery: DeliveryRow, wave: number) {
  const { data, error } = await db
    .from("driver_profiles")
    .select("user_id, available, verification_status, rating_avg, deliveries_completed")
    .neq("verification_status", "revoked")
    .order("rating_avg", { ascending: false })
    .order("deliveries_completed", { ascending: false });
  if (error) throw new Error(error.message);

  // Every wave applies the same eligibility rules — offline drivers are never
  // offered work, no matter how late the wave.
  const pool = (data ?? []).filter((d: any) => d.available);

  const { data: existing } = await db
    .from("delivery_offers")
    .select("driver_user_id")
    .eq("delivery_id", delivery.id);
  const already = new Set((existing ?? []).map((o: any) => o.driver_user_id));

  return pool.filter((d: any) => !already.has(d.user_id)).slice(0, WAVE_SIZE);
}

export async function createDeliveryOffers(db: Admin, delivery: DeliveryRow, wave: number) {
  const picks = await pickWaveDrivers(db, delivery, wave);
  if (picks.length === 0) return 0;

  const expiresAt = new Date(Date.now() + OFFER_WINDOW_SECONDS * 1000).toISOString();
  const { error } = await db.from("delivery_offers").insert(
    picks.map((d: any) => ({
      delivery_id: delivery.id,
      driver_user_id: d.user_id,
      wave,
      status: "offered",
      expires_at: expiresAt,
    })),
  );
  if (error) throw new Error(error.message);

  await logDeliveryEvent(db, delivery.id, "driver_offered", null, { wave, drivers: picks.length }, `driver_offered:${wave}`);

  await db.from("notifications").insert(
    picks.map((d: any) => ({
      user_id: d.user_id,
      title: "New delivery offer",
      body: `${delivery.pickup_address} → ${delivery.dropoff_address}${
        delivery.price ? ` · $${Number(delivery.price).toFixed(2)}` : ""
      }`,
      link: "/driver",
      kind: "delivery_offer",
    })),
  );
  return picks.length;
}

export async function expireDeliveryOffers(db: Admin, deliveryId: string) {
  const { data: expired } = await db
    .from("delivery_offers")
    .update({ status: "expired" })
    .eq("delivery_id", deliveryId)
    .eq("status", "offered")
    .lt("expires_at", new Date().toISOString())
    .select("id, wave");
  if (expired?.length) {
    const wave = (expired[0] as any).wave;
    await logDeliveryEvent(db, deliveryId, "delivery_expired", null, { wave, offers: expired.length }, `delivery_expired:${wave}`);
  }
}

/** Moves a delivery to the next dispatch wave when the current one is dead. */
export async function advanceDelivery(db: Admin, deliveryId: string) {
  const { data, error } = await db.from("deliveries").select("*").eq("id", deliveryId).single();
  if (error) throw new Error(error.message);
  const d = data as DeliveryRow;

  if (d.driver_id || d.status === "cancelled" || d.dispatch_state === "assigned") {
    return { state: d.dispatch_state, wave: d.dispatch_wave };
  }

  await expireDeliveryOffers(db, deliveryId);

  const { data: live } = await db
    .from("delivery_offers")
    .select("id")
    .eq("delivery_id", deliveryId)
    .eq("status", "offered");
  if ((live ?? []).length > 0) return { state: d.dispatch_state, wave: d.dispatch_wave };

  const nextWave = d.dispatch_wave + 1;
  const giveUp = async () => {
    const { data: settled } = await db
      .from("deliveries")
      .update({ dispatch_state: "no_drivers" })
      .eq("id", deliveryId)
      .neq("dispatch_state", "no_drivers")
      .select("id");
    // Only the transition into the terminal state notifies / audits.
    if (settled?.length) {
      await db.from("notifications").insert({
        user_id: d.customer_id,
        title: "No driver available yet",
        body: "We could not find an available driver. You can retry or reschedule.",
        link: `/deliveries/${deliveryId}`,
        kind: "no_drivers",
      });
      await logDeliveryEvent(db, deliveryId, "delivery_unfulfilled", null, { wave: d.dispatch_wave }, "delivery_unfulfilled");
    }
    return { state: "no_drivers", wave: d.dispatch_wave };
  };
  if (nextWave > MAX_WAVES) return giveUp();

  const created = await createDeliveryOffers(db, d, nextWave);
  if (created === 0) return giveUp();

  await db.from("deliveries").update({ dispatch_wave: nextWave }).eq("id", deliveryId);
  await logDeliveryEvent(db, deliveryId, "delivery_dispatched", null, { wave: nextWave }, `delivery_dispatched:${nextWave}`);
  return { state: d.dispatch_state, wave: nextWave };
}

/** Race-safe claim: only the first driver to accept wins. */
export async function claimDelivery(db: Admin, offerId: string, userId: string) {
  const { data: offer, error } = await db
    .from("delivery_offers")
    .select("*")
    .eq("id", offerId)
    .eq("driver_user_id", userId)
    .single();
  if (error || !offer) throw new Error("Offer not found");
  if (offer.status !== "offered") return { won: false, reason: "This delivery is no longer available." };
  if (new Date(offer.expires_at).getTime() < Date.now()) {
    await db.from("delivery_offers").update({ status: "expired" }).eq("id", offerId);
    await logDeliveryEvent(db, offer.delivery_id, "driver_offer_expired", userId, { offer_id: offerId }, `driver_offer_expired:${offerId}`);
    return { won: false, reason: "The offer window closed." };
  }

  const { data: claimed } = await db
    .from("deliveries")
    .update({ driver_id: userId, status: "accepted", dispatch_state: "assigned" })
    .eq("id", offer.delivery_id)
    .is("driver_id", null)
    .eq("status", "pending")
    .select("id, customer_id")
    .maybeSingle();

  if (!claimed) {
    await db
      .from("delivery_offers")
      .update({ status: "lost", responded_at: new Date().toISOString() })
      .eq("id", offerId);
    return { won: false, reason: "Another driver accepted first." };
  }

  await db
    .from("delivery_offers")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", offerId);
  await db
    .from("delivery_offers")
    .update({ status: "lost" })
    .eq("delivery_id", offer.delivery_id)
    .neq("id", offerId)
    .in("status", ["offered", "expired"]);

  await logDeliveryEvent(db, offer.delivery_id, "driver_accepted", userId, { offer_id: offerId }, `driver_accepted:${offerId}`);
  await logDeliveryEvent(db, offer.delivery_id, "driver_assigned", userId, { driver_id: userId }, "driver_assigned");

  await db.from("notifications").insert({
    user_id: claimed.customer_id,
    title: "Driver on the way",
    body: "A Zwits driver accepted your delivery.",
    link: `/deliveries/${claimed.id}`,
    kind: "delivery_accepted",
  });

  return { won: true, deliveryId: offer.delivery_id };
}

export { haversineKm };

/**
 * Server-authoritative delivery expiry sweep, invoked by the scheduled
 * dispatch hook. Idempotent — `advanceDelivery` no-ops on assigned/cancelled.
 */
export async function sweepExpiredDeliveries(db: Admin, limit = 100) {
  const { data: stale, error } = await db
    .from("delivery_offers")
    .select("delivery_id")
    .eq("status", "offered")
    .lt("expires_at", new Date().toISOString())
    .limit(limit * 5);
  if (error) throw new Error(error.message);

  const ids = Array.from(new Set((stale ?? []).map((o: any) => o.delivery_id as string))).slice(0, limit);
  let advanced = 0;
  for (const id of ids) {
    try {
      await advanceDelivery(db, id);
      advanced += 1;
    } catch {
      /* keep sweeping */
    }
  }
  return { checked: ids.length, advanced };
}
