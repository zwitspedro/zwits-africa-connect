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
      link: "/provider/dashboard",
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

/**
 * Race-safe assignment.
 *
 * All validation, locking, assignment, offer resolution, status history and
 * the customer notification happen inside one Postgres function
 * (`accept_job_offer`), so two providers pressing Accept at the same moment
 * can never both win, and a retried accept is idempotent.
 */
export async function claimJob(db: Admin, offerId: string, userId: string) {
  const { data, error } = await db.rpc("accept_job_offer", {
    _offer_id: offerId,
    _user_id: userId,
  });
  if (error) throw new Error(error.message);
  const result = (data ?? {}) as { won: boolean; reason?: string; bookingId?: string; idempotent?: boolean };

  if (result.won && result.bookingId && !result.idempotent) {
    await logEvent(db, result.bookingId, "provider_accepted", userId, { offer_id: offerId });
  }
  return result;
}

/** Validated, audited cancellation for customers, providers and admins. */
export async function cancelBooking(db: Admin, bookingId: string, actorId: string, reason: string) {
  const { data, error } = await db.rpc("cancel_booking_as", {
    _booking_id: bookingId,
    _actor: actorId,
    _reason: reason,
  });
  if (error) throw new Error(error.message);
  return (data ?? { ok: true }) as { ok: boolean; previous?: string; role?: string; idempotent?: boolean };
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


/**
 * Server-authoritative expiry sweep.
 *
 * Runs from the scheduled `/api/public/hooks/dispatch-sweep` endpoint so a job
 * keeps moving even when every browser involved is closed. Idempotent: it only
 * touches bookings still looking for a provider, and `advance` itself is a
 * no-op once a booking is assigned, cancelled or already settled.
 */
export async function sweepExpiredDispatch(db: Admin, limit = 100) {
  const nowIso = new Date().toISOString();

  const { data: stale, error } = await db
    .from("job_offers")
    .select("booking_id")
    .eq("status", "offered")
    .lt("expires_at", nowIso)
    .limit(limit * 5);
  if (error) throw new Error(error.message);

  const bookingIds = Array.from(new Set((stale ?? []).map((o: any) => o.booking_id as string))).slice(0, limit);
  let advanced = 0;
  for (const id of bookingIds) {
    try {
      await advance(db, id, []);
      advanced += 1;
    } catch {
      /* one bad booking must not stop the sweep */
    }
  }
  return { checked: bookingIds.length, advanced };
}
