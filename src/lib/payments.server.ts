import type { SupabaseClient } from "@supabase/supabase-js";
import { gatewayFor } from "./payment-providers.server";

type Admin = SupabaseClient<any, "public", any>;

export async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Admin;
}

/** Amount the customer owes for a booking, decided server-side only. */
export function bookingAmount(b: { price: number | null; budget: number | null }) {
  const amount = Number(b.price ?? b.budget ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("This booking has no agreed price yet");
  }
  return Math.round(amount * 100) / 100;
}

/** Creates (or reuses) the single payment record attached to a booking. */
export async function openBookingPayment(
  db: Admin,
  bookingId: string,
  customerId: string,
  method: string,
  amount: number,
  customerPhone?: string | null,
) {
  const gateway = gatewayFor(method);

  const { data: existing } = await db
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existing && ["paid", "processing", "refunded"].includes(existing.status)) {
    return existing;
  }

  const initiated = await gateway.initiate({
    reference: `booking:${bookingId}`,
    amount,
    currency: "USD",
    customerPhone,
  });

  const row = {
    booking_id: bookingId,
    customer_id: customerId,
    amount,
    currency: "USD",
    payment_method: method,
    provider: gateway.id,
    external_reference: initiated.externalReference,
    status: initiated.status,
  };

  const { data, error } = existing
    ? await db.from("payments").update(row).eq("id", existing.id).select("*").single()
    : await db.from("payments").insert(row).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Server-side truth about a payment. Cash is confirmed by the platform when the
 * job completes; every other rail is re-checked against the gateway.
 */
export async function verifyPayment(db: Admin, paymentId: string) {
  const { data: payment, error } = await db
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();
  if (error) throw new Error(error.message);
  if (payment.status === "paid") return payment;

  if (payment.payment_method === "cash") return payment;

  const gateway = gatewayFor(payment.payment_method);
  const result = await gateway.verify(payment.external_reference ?? "");

  const { data: updated, error: upErr } = await db
    .from("payments")
    .update({
      status: result.status,
      failure_reason: result.failureReason ?? null,
      paid_at: result.status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", payment.id)
    .select("*")
    .single();
  if (upErr) throw new Error(upErr.message);
  return updated;
}

/** Marks a payment collected. Only ever called from authorised server paths. */
export async function markPaid(db: Admin, paymentId: string, note?: string) {
  const { data, error } = await db
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      failure_reason: null,
      metadata: note ? { note } : null,
    })
    .eq("id", paymentId)
    .neq("status", "refunded")
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Runs the accounting for a completed, paid booking: commission out, provider
 * earnings into the immutable ledger. Idempotent inside Postgres.
 */
export async function settle(db: Admin, bookingId: string) {
  const { data, error } = await db.rpc("settle_booking", { _booking_id: bookingId });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    gross: Number(row?.gross ?? 0),
    commission: Number(row?.commission ?? 0),
    providerEarnings: Number(row?.provider_earnings ?? 0),
  };
}
