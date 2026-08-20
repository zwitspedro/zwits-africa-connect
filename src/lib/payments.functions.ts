import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MethodSchema = z.object({
  bookingId: z.string().uuid(),
  method: z.enum(["cash", "ecocash", "innbucks", "zipit", "mukuru", "bank_transfer"]),
});

/** Payment rails the platform can actually take money through right now. */
export const listPaymentMethods = createServerFn({ method: "GET" }).handler(async () => {
  const { availableMethods } = await import("./payment-providers.server");
  return availableMethods();
});

/** Customer chooses how to pay. The amount is decided by the server. */
export const startBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => MethodSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { admin, bookingAmount, openBookingPayment } = await import("./payments.server");

    const { data: booking, error } = await context.supabase
      .from("bookings")
      .select("id, customer_id, price, budget, status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!booking || booking.customer_id !== context.userId) {
      throw new Error("Booking not found");
    }
    if (booking.status === "cancelled") throw new Error("This booking was cancelled");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("phone")
      .eq("user_id", context.userId)
      .maybeSingle();

    const db = await admin();
    const payment = await openBookingPayment(
      db,
      booking.id,
      context.userId,
      data.method,
      bookingAmount(booking),
      profile?.phone ?? null,
    );

    return {
      paymentId: payment.id as string,
      status: payment.status as string,
      amount: Number(payment.amount),
      method: payment.payment_method as string,
    };
  });

/**
 * Confirms payment for a completed booking and runs settlement.
 *
 * Cash may only be marked collected by the provider who did the job, or an
 * admin. Every other rail is re-verified against the gateway — the client's
 * word is never accepted.
 */
export const confirmBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ bookingId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin, verifyPayment, markPaid, settle } = await import("./payments.server");

    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    const db = await admin();

    const { data: booking, error } = await db
      .from("bookings")
      .select("id, status, category, customer_id, provider_id, providers(user_id)")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!booking) throw new Error("Booking not found");

    const providerUserId = (booking as any).providers?.user_id as string | undefined;
    const isProvider = providerUserId === context.userId;
    const isCustomer = booking.customer_id === context.userId;
    if (!isAdmin && !isProvider && !isCustomer) throw new Error("Forbidden");

    if (booking.status !== "completed") {
      throw new Error("The job must be completed before payment is settled");
    }

    const { data: payment } = await db
      .from("payments")
      .select("*")
      .eq("booking_id", booking.id)
      .maybeSingle();
    if (!payment) throw new Error("No payment has been started for this booking");

    let current = payment;
    if (current.status !== "paid") {
      if (current.payment_method === "cash") {
        if (!isProvider && !isAdmin) {
          throw new Error("Only the provider can confirm they received cash");
        }
        current = await markPaid(db, current.id, "Cash collected on completion");
      } else {
        current = await verifyPayment(db, current.id);
      }
    }

    if (current.status !== "paid") {
      // Never report success on an unverified payment.
      throw new Error(
        current.failure_reason ?? "Payment is not confirmed yet. Please try again shortly.",
      );
    }

    await db
      .from("bookings")
      .update({ payment_status: "paid", payment_reference: current.external_reference })
      .eq("id", booking.id);

    const totals = await settle(db, booking.id);

    await db.from("notifications").insert({
      user_id: booking.customer_id,
      title: "Payment complete",
      body: `Your ${booking.category} booking is paid and closed.`,
      link: `/bookings/${booking.id}`,
      kind: "payment_received",
    });

    return { ok: true as const, ...totals };
  });

/** Payment record for a booking, visible to its participants. */
export const getBookingPayment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ bookingId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: payment, error } = await context.supabase
      .from("payments")
      .select("id, amount, currency, payment_method, status, paid_at, failure_reason")
      .eq("booking_id", data.bookingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return payment;
  });
