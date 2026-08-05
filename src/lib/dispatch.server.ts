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
  customer_id?: string | null;
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

/** Max concurrent open jobs a provider may hold before we stop offering more. */
export const PROVIDER_CAPACITY = 3;

/** Records a marketplace lifecycle event on the booking audit trail. */
export async function logEvent(
  db: Admin,
  bookingId: string,
  event: string,
  actor: string | null = null,
  metadata: Record<string, unknown> | null = null,
) {
  try {
    await db.rpc("log_marketplace_event", {
      _booking_id: bookingId,
      _event: event,
      _actor: actor,
      _metadata: metadata as any,
    });
  } catch {
    /* auditing must never break the marketplace flow */
  }
}

/**
 * Server-authoritative shortlist for a wave.
 *
 * `rankedProviderIds` is a CLIENT HINT ONLY: it may reorder providers the
 * server has already independently judged eligible, and can never add one.
 * Eligibility is decided here from approved verification status, online flag,
 * category, server-side working hours / leave, and current capacity.
 */
export async function pickWaveProviders(
  db: Admin,
  booking: BookingRow,
  wave: number,
  rankedProviderIds: string[],
) {
  const { data, error } = await db
    .from("providers")
    .select("id, user_id, rating_avg, jobs_completed, available, verification_status, category, onboarding_completed_at")
    .eq("category", booking.category)
    .eq("verification_status", "approved")
    .not("onboarding_completed_at", "is", null)
    .order("rating_avg", { ascending: false })
    .order("jobs_completed", { ascending: false });
  if (error) throw new Error(error.message);

  // Every wave applies the SAME eligibility rules: approved, onboarded, online,
  // within working hours / not on leave, right category, and under capacity.
  // Later waves widen reach only by offering to more of that eligible set.
  const pool = (data ?? []).filter(
    (p) => p.verification_status === "approved" && p.available,
  );

  const { data: existing } = await db
    .from("job_offers")
    .select("provider_id")
    .eq("booking_id", booking.id);
  const already = new Set((existing ?? []).map((o: any) => o.provider_id));

  const candidates = pool.filter((p) => !already.has(p.id));
  if (candidates.length === 0) return [];

  // Capacity: exclude providers already holding too many open jobs.
  const { data: openJobs } = await db
    .from("bookings")
    .select("provider_id")
    .in("status", ["accepted", "travelling", "arrived", "in_progress"])
    .in(
      "provider_id",
      candidates.map((p) => p.id),
    );
  const load = new Map<string, number>();
  for (const j of openJobs ?? []) {
    const id = (j as any).provider_id as string;
    load.set(id, (load.get(id) ?? 0) + 1);
  }

  const at = booking.scheduled_for ?? new Date().toISOString();
  const withCapacity = candidates.filter((p) => (load.get(p.id) ?? 0) < PROVIDER_CAPACITY);
  if (withCapacity.length === 0) return [];

  // Working hours / leave, authoritative on the server. Set-based: one round
  // trip evaluating the very same is_provider_available_at predicate per user.
  const { data: availableRows, error: availErr } = await db.rpc("providers_available_at", {
    _user_ids: withCapacity.map((p) => p.user_id),
    _at: at,
  });
  if (availErr) throw new Error(availErr.message);
  const availableUsers = new Set((availableRows ?? []).map((r: any) => r.user_id as string));
  const eligible = withCapacity.filter((p) => availableUsers.has(p.user_id));

  // Client hints may only reorder the server-approved set.
  const rank = new Map(rankedProviderIds.map((id, i) => [id, i]));
  const sorted = [...eligible].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id)! : Number.MAX_SAFE_INTEGER;
    const rb = rank.has(b.id) ? rank.get(b.id)! : Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });

  return sorted.slice(0, WAVE_SIZE);
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
  await logEvent(db, booking.id, "dispatch_offered", null, {
    wave,
    providers: picks.length,
    mode,
  });
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
 * Ends dispatch when nobody eligible remains. Idempotent: the customer is only
 * notified the first time the booking moves into the terminal dispatch state.
 */
async function settleUnfulfilled(db: Admin, b: BookingRow) {
  const finalState = b.fulfilment_mode === "quotes" ? "collecting_quotes" : "no_providers";
  if (b.dispatch_state === finalState) return finalState;

  await db
    .from("bookings")
    .update({ dispatch_state: finalState, dispatch_updated_at: new Date().toISOString() })
    .eq("id", b.id)
    .neq("dispatch_state", finalState);

  if (finalState === "no_providers" && b.customer_id) {
    await db.from("notifications").insert({
      user_id: b.customer_id,
      title: "No provider available yet",
      body: `We could not find an available ${b.category} provider. You can retry or reschedule.`,
      link: `/bookings/${b.id}`,
      kind: "no_providers",
    });
  }
  await logEvent(db, b.id, `dispatch_${finalState}`, null, { wave: b.dispatch_wave });
  return finalState;
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
    return { state: await settleUnfulfilled(db, b), wave: b.dispatch_wave };
  }

  const created = await createOffers(db, b, nextWave, rankedProviderIds);
  if (created === 0) {
    return { state: await settleUnfulfilled(db, b), wave: b.dispatch_wave };
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

  // Re-verify eligibility at the moment of assignment: an approval can be
  // revoked between the offer and the accept.
  const { data: prov } = await db
    .from("providers")
    .select("id, verification_status")
    .eq("id", offer.provider_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!prov || prov.verification_status !== "approved") {
    await db.from("job_offers").update({ status: "lost" }).eq("id", offerId);
    return { won: false, reason: "Your account is not approved for this job." };
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
  await logEvent(db, claimed.id as string, "provider_accepted", userId, {
    provider_id: offer.provider_id,
    offer_id: offerId,
  });

  return { won: true, bookingId: offer.booking_id };
}

export async function declineOffer(db: Admin, offerId: string, userId: string) {
  const { data: declined, error } = await db
    .from("job_offers")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("provider_user_id", userId)
    .eq("status", "offered")
    .select("id, booking_id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!declined) return { ok: true };

  await logEvent(db, declined.booking_id as string, "provider_declined", userId, { offer_id: offerId });
  // Move the job on immediately rather than waiting for the offer to time out.
  try {
    await advance(db, declined.booking_id as string, []);
  } catch {
    /* the dispatch poller will retry */
  }
  return { ok: true };
}

