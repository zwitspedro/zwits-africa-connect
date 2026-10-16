import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PageSchema = z.object({
  page: z.number().int().min(0).max(500).default(0),
  pageSize: z.number().int().min(1).max(100).default(25),
});

const WithdrawSchema = z.object({
  amount: z.number().positive().max(100000),
  method: z.enum(["ecocash", "innbucks", "bank_transfer", "cash"]),
  destination: z.string().trim().min(4).max(120),
});

/** Provider's own wallet balances. RLS keeps this to the caller. */
export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("provider_wallets")
      .select("available_balance, pending_balance, lifetime_earnings, currency")
      .eq("provider_user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (
      data ?? {
        available_balance: 0,
        pending_balance: 0,
        lifetime_earnings: 0,
        currency: "USD",
      }
    );
  });

/** Paginated, immutable ledger for the signed-in provider. */
export const listMyLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => PageSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const from = data.page * data.pageSize;
    const { data: rows, count, error } = await context.supabase
      .from("wallet_transactions")
      .select("id, type, amount, balance_after, reference, note, booking_id, created_at", {
        count: "exact",
      })
      .eq("provider_user_id", context.userId)
      .order("created_at", { ascending: false })
      .range(from, from + data.pageSize - 1);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

/**
 * Withdrawal request. The balance check, the duplicate-request check and the
 * ledger debit all happen here — the client only asks.
 */
export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => WithdrawSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("request_wallet_withdrawal", {
      _amount: data.amount, _method: data.method, _destination: data.destination,
    });
    if (error) throw new Error(error.message);
    return result as { ok: true; withdrawalId: string };
  });

/** Admin marks a withdrawal paid or failed. Failure refunds the ledger. */
export const settleWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        withdrawalId: z.string().uuid(),
        outcome: z.enum(["processing", "paid", "failed", "cancelled"]),
        reason: z.string().max(300).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("admin_decide_withdrawal", {
      _id: data.withdrawalId, _outcome: data.outcome, _reason: data.reason ?? "",
    });
    if (error) throw new Error(error.message);
    return result as { ok: true };
  });

/** Admin queue of withdrawal requests, newest first. */
export const listWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        status: z
          .enum(["all", "requested", "processing", "paid", "failed", "cancelled"])
          .default("requested"),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    let q = db
      .from("provider_withdrawals")
      .select(
        "id, provider_user_id, amount, method, destination, status, failure_reason, created_at, processed_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status !== "all") q = q.eq("status", data.status);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as any[];
  });
