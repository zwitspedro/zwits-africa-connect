import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OpenSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
});

/** Either party on a booking may raise a dispute. RLS enforces membership. */
export const openDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => OpenSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("disputes")
      .select("id")
      .eq("booking_id", data.bookingId)
      .in("status", ["open", "investigating"])
      .maybeSingle();
    if (existing) throw new Error("A dispute is already open on this booking");

    const { data: row, error } = await context.supabase
      .from("disputes")
      .insert({
        booking_id: data.bookingId,
        opened_by: context.userId,
        reason: data.reason,
        description: data.description ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, disputeId: row.id };
  });

/** Disputes visible to the caller (their own bookings, or all for admins). */
export const listDisputes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ page: z.number().int().min(0).max(200).default(0) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const size = 25;
    const from = data.page * size;
    const { data: rows, count, error } = await context.supabase
      .from("disputes")
      .select("id, booking_id, reason, description, status, resolution, created_at, resolved_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(from, from + size - 1);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page };
  });

/**
 * Admin resolution. A refund reverses the provider's earning through the
 * ledger rather than editing a balance, so the trail stays auditable.
 */
export const resolveDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        disputeId: z.string().uuid(),
        status: z.enum(["investigating", "resolved", "rejected"]),
        resolution: z.string().trim().max(2000).optional().nullable(),
        refundProviderEarnings: z.number().min(0).max(100000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: dispute, error } = await db
      .from("disputes")
      .select("*, bookings(id, customer_id, provider_id, category, providers(user_id))")
      .eq("id", data.disputeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!dispute) throw new Error("Dispute not found");

    if (data.refundProviderEarnings && data.refundProviderEarnings > 0) {
      const providerUserId = dispute.bookings?.providers?.user_id;
      if (!providerUserId) throw new Error("This booking has no provider to adjust");
      const { error: ledgerError } = await db.rpc("post_wallet_transaction", {
        _provider_user_id: providerUserId,
        _type: "adjustment",
        _amount: -data.refundProviderEarnings,
        _reference: `dispute:${dispute.id}:adjustment`,
        _booking_id: dispute.booking_id,
        _note: data.resolution ?? "Dispute adjustment",
        _allow_negative: true,
      });
      if (ledgerError) throw new Error(ledgerError.message);
    }

    await db
      .from("disputes")
      .update({
        status: data.status,
        resolution: data.resolution ?? null,
        resolved_by: data.status === "investigating" ? null : context.userId,
        resolved_at: data.status === "investigating" ? null : new Date().toISOString(),
      })
      .eq("id", dispute.id);

    await db.rpc("log_admin_action", {
      _action: `dispute_${data.status}`,
      _subject_type: "dispute",
      _subject_id: dispute.id,
      _metadata: {
        resolution: data.resolution ?? null,
        adjustment: data.refundProviderEarnings ?? 0,
      },
    });

    await db.from("notifications").insert({
      user_id: dispute.opened_by,
      title: `Dispute ${data.status}`,
      body: data.resolution ?? "An admin updated your dispute.",
      link: `/bookings/${dispute.booking_id}`,
      kind: `dispute_${data.status}`,
    });

    return { ok: true as const };
  });
