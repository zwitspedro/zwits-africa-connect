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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: pending } = await db
      .from("provider_withdrawals")
      .select("id")
      .eq("provider_user_id", context.userId)
      .in("status", ["requested", "processing"])
      .maybeSingle();
    if (pending) {
      throw new Error("You already have a withdrawal in progress. Wait for it to finish.");
    }

    const { data: wallet } = await db
      .from("provider_wallets")
      .select("available_balance")
      .eq("provider_user_id", context.userId)
      .maybeSingle();
    const available = Number(wallet?.available_balance ?? 0);
    if (data.amount > available) {
      throw new Error(`You can withdraw up to $${available.toFixed(2)} right now.`);
    }

    const { data: withdrawal, error } = await db
      .from("provider_withdrawals")
      .insert({
        provider_user_id: context.userId,
        amount: data.amount,
        method: data.method,
        destination: data.destination,
        status: "requested",
      })
      .select("id, amount, status")
      .single();
    if (error) throw new Error(error.message);

    // Debit immediately so the same balance cannot be withdrawn twice.
    const { error: ledgerError } = await db.rpc("post_wallet_transaction", {
      _provider_user_id: context.userId,
      _type: "withdrawal",
      _amount: -data.amount,
      _reference: `withdrawal:${withdrawal.id}`,
      _withdrawal_id: withdrawal.id,
      _note: `Withdrawal to ${data.destination}`,
    });
    if (ledgerError) {
      // The money never moved, so the request must not survive either.
      await db.from("provider_withdrawals").delete().eq("id", withdrawal.id);
      throw new Error(ledgerError.message);
    }

    await db.from("notifications").insert({
      user_id: context.userId,
      title: "Withdrawal requested",
      body: `We received your request for $${data.amount.toFixed(2)}.`,
      link: "/provider/dashboard",
      kind: "withdrawal_requested",
    });

    return { ok: true as const, withdrawalId: withdrawal.id as string };
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
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: w, error } = await db
      .from("provider_withdrawals")
      .select("*")
      .eq("id", data.withdrawalId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!w) throw new Error("Withdrawal not found");
    if (["paid", "failed", "cancelled"].includes(w.status)) {
      throw new Error("This withdrawal is already settled");
    }

    await db
      .from("provider_withdrawals")
      .update({
        status: data.outcome,
        failure_reason: data.reason ?? null,
        processed_at: data.outcome === "processing" ? null : new Date().toISOString(),
      })
      .eq("id", w.id);

    if (data.outcome === "failed" || data.outcome === "cancelled") {
      await db.rpc("post_wallet_transaction", {
        _provider_user_id: w.provider_user_id,
        _type: "refund",
        _amount: Number(w.amount),
        _reference: `withdrawal:${w.id}:reversal`,
        _withdrawal_id: w.id,
        _note: data.reason ?? "Withdrawal returned",
      });
    }

    await db.rpc("log_admin_action", {
      _action: `withdrawal_${data.outcome}`,
      _subject_type: "withdrawal",
      _subject_id: w.id,
      _metadata: { amount: w.amount, reason: data.reason ?? null },
    });

    await db.from("notifications").insert({
      user_id: w.provider_user_id,
      title: data.outcome === "paid" ? "Withdrawal paid" : `Withdrawal ${data.outcome}`,
      body:
        data.outcome === "paid"
          ? `$${Number(w.amount).toFixed(2)} is on its way to ${w.destination}.`
          : (data.reason ?? "Your withdrawal could not be completed. The amount was returned."),
      link: "/provider/dashboard",
      kind: `withdrawal_${data.outcome}`,
    });

    return { ok: true as const };
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
