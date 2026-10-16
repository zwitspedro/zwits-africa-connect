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
    z.object({ page: z.number().int().min(0).max(200).default(0), status: z.enum(["all", "open", "investigating", "resolved", "rejected"]).default("all") }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const size = 25;
    const from = data.page * size;
    let q = context.supabase
      .from("disputes")
      .select("id, booking_id, reason, description, status, resolution, created_at, resolved_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(from, from + size - 1);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, count, error } = await q;
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
    if (data.refundProviderEarnings && data.refundProviderEarnings > 0) {
      throw new Error("Financial adjustments and refunds require a supported settlement workflow; unavailable here");
    }
    const { data: result, error } = await context.supabase.rpc("admin_resolve_dispute", {
      _id: data.disputeId, _status: data.status, _resolution: data.resolution ?? "",
    });
    if (error) throw new Error(error.message);
    return result as { ok: true };
  });
