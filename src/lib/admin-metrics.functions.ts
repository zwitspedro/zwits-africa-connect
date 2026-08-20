import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Live operational picture for the admin dashboard. Real data only. */
export const getAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const count = async (table: string, build: (q: any) => any = (q) => q) => {
      const { count: c } = await build(db.from(table).select("id", { count: "exact", head: true }));
      return c ?? 0;
    };

    const [
      customers,
      providers,
      onlineProviders,
      pendingVerification,
      activeJobs,
      completedJobs,
      cancelledJobs,
      openDisputes,
      failedPayments,
      pendingWithdrawals,
    ] = await Promise.all([
      count("user_roles", (q) => q.eq("role", "customer")),
      count("providers"),
      count("providers", (q) => q.eq("available", true).eq("verification_status", "approved")),
      count("providers", (q) => q.eq("verification_status", "pending")),
      count("bookings", (q) =>
        q.in("status", ["accepted", "travelling", "arrived", "in_progress"]),
      ),
      count("bookings", (q) => q.eq("status", "completed")),
      count("bookings", (q) => q.eq("status", "cancelled")),
      count("disputes", (q) => q.in("status", ["open", "investigating"])),
      count("payments", (q) => q.eq("status", "failed")),
      count("provider_withdrawals", (q) => q.in("status", ["requested", "processing"])),
    ]);

    const { data: revenueRows } = await db
      .from("payments")
      .select("amount")
      .eq("status", "paid")
      .limit(10000);
    const revenue = (revenueRows ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0);

    const { data: earningRows } = await db
      .from("wallet_transactions")
      .select("amount")
      .eq("type", "job_earning")
      .limit(10000);
    const providerEarnings = (earningRows ?? []).reduce(
      (s: number, r: any) => s + Number(r.amount),
      0,
    );

    return {
      customers,
      providers,
      onlineProviders,
      pendingVerification,
      activeJobs,
      completedJobs,
      cancelledJobs,
      openDisputes,
      failedPayments,
      pendingWithdrawals,
      revenue: Math.round(revenue * 100) / 100,
      providerEarnings: Math.round(providerEarnings * 100) / 100,
      commission: Math.round((revenue - providerEarnings) * 100) / 100,
    };
  });

/** Paginated admin audit trail. */
export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ page: z.number().int().min(0).max(500).default(0) })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const size = 50;
    const from = data.page * size;
    const { data: rows, count, error } = await context.supabase
      .from("admin_audit_log")
      .select("id, actor, action, subject_type, subject_id, metadata, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(from, from + size - 1);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page };
  });
