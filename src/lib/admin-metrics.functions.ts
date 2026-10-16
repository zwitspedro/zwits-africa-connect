import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminMetrics = {
  customers: number; providers: number; onlineProviders: number; onlineDrivers: number;
  pendingVerification: number; activeJobs: number; activeDeliveries: number; completedJobs: number;
  completedDeliveries: number; cancelledJobs: number; openDisputes: number; failedPayments: number;
  pendingWithdrawals: number; auditEvents: number; failedUploads: number; approvedProviders: number;
  revokedProviders: number; avgRating: number | null; ratingsCount: number; revenue: number;
  providerEarnings: number; commission: number; grossTransactionValue: number; cashPayments: number;
  electronicPayments: number; walletLiabilities: number; commissionDebt: number;
  pendingWithdrawalValue: number; settledWithdrawalValue: number; checkedAt: string;
};
export const getAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ from: z.string().datetime(), to: z.string().datetime() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: metrics, error } = await context.supabase.rpc("admin_period_metrics", {
      _from: data.from, _to: data.to,
    });
    if (error || !metrics) throw new Error("Unable to load authoritative metrics. Please retry.");
    return metrics as unknown as AdminMetrics;
  });

/**
 * The actual providers behind the "Providers online" tile — same filter as the
 * count (available + approved), so the number and the list can never disagree.
 */
export const listOnlineProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: rows, error, count: total } = await context.supabase
      .from("providers")
      .select(
        "id, business_name, category, city, verification_status, available, rating_avg, ratings_count, jobs_completed, updated_at",
        { count: "exact" },
      )
      .eq("available", true)
      .eq("verification_status", "approved")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: total ?? 0 };
  });


/** Single head-count for the "Providers online" tile — cheap enough to poll. */
export const getOnlineProvidersCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { count: c, error } = await context.supabase
      .from("providers")
      .select("id", { count: "exact", head: true })
      .eq("available", true)
      .eq("verification_status", "approved");
    if (error) throw new Error(error.message);
    return { count: c ?? 0 };
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

const cleanTerm = (s: string) => s.replace(/[%,"()\\]/g, " ").trim().slice(0, 60);

/** Paginated admin audit trail with optional filters. */
export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        page: z.number().int().min(0).max(500).default(0),
        action: z.string().max(60).optional(),
        subjectType: z.string().max(40).optional(),
        actor: z.string().uuid().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const size = 50;
    const from = data.page * size;
    let q = context.supabase
      .from("admin_audit_log")
      .select("id, actor, action, subject_type, subject_id, metadata, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(from, from + size - 1);
    if (data.action) q = q.ilike("action", `%${cleanTerm(data.action)}%`);
    if (data.subjectType) q = q.eq("subject_type", data.subjectType);
    if (data.actor) q = q.eq("actor", data.actor);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page };
  });

/** Paginated payments list for admins, filterable by status (e.g. "failed"). */
export const listAdminPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        status: z.string().max(30).optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        page: z.number().int().min(0).max(500).default(0),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const size = 25;
    const from = data.page * size;
    let q = db
      .from("payments")
      .select(
        "id, booking_id, delivery_id, customer_id, amount, currency, payment_method, provider, status, failure_reason, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, from + size - 1);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.from) q = q.gte(data.status === "paid" ? "paid_at" : "created_at", data.from);
    if (data.to) q = q.lt(data.status === "paid" ? "paid_at" : "created_at", data.to);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    const ids = [...new Set((rows ?? []).map((r: any) => r.customer_id).filter(Boolean))];
    const names: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await db
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);
      for (const p of profs ?? []) names[p.user_id] = p.display_name ?? "Customer";
    }
    return {
      rows: (rows ?? []).map((r: any) => ({ ...r, customer_name: names[r.customer_id] ?? null })),
      total: count ?? 0,
      page: data.page,
    };
  });

/** Failed/rejected provider document uploads, with provider names. */
export const listAdminUploads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ page: z.number().int().min(0).max(500).default(0) })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const size = 25;
    const from = data.page * size;
    const { data: rows, count, error } = await db
      .from("provider_document_audits")
      .select(
        "id, provider_user_id, doc_key, file_name, file_size, mime_type, status, errors, created_at",
        { count: "exact" },
      )
      .in("status", ["rejected", "upload_error"])
      .order("created_at", { ascending: false })
      .range(from, from + size - 1);
    if (error) throw new Error(error.message);

    const userIds = [...new Set((rows ?? []).map((r: any) => r.provider_user_id))];
    const names: Record<string, string> = {};
    if (userIds.length) {
      const { data: provs } = await db
        .from("providers")
        .select("user_id, business_name, verification_status")
        .in("user_id", userIds);
      for (const p of provs ?? []) {
        names[p.user_id] = p.business_name ?? "Provider";
      }
    }
    return {
      rows: (rows ?? []).map((r: any) => ({
        ...r,
        provider_name: names[r.provider_user_id] ?? "Unknown provider",
        storage_path: undefined, // never expose private storage paths
      })),
      total: count ?? 0,
      page: data.page,
    };
  });

/** Owner details are exposed only after an admin check in the database. */
export const listAdminCustomers = createServerFn({ method: "GET" })
 .middleware([requireSupabaseAuth])
 .inputValidator(input=>z.object({search:z.string().max(80).optional(),page:z.number().int().min(0).max(10000).default(0),from:z.string().datetime().optional(),to:z.string().datetime().optional()}).parse(input??{}))
 .handler(async({data,context})=>{
  const {data:result,error}=await context.supabase.rpc("admin_customer_directory",{_term:data.search??"",_page:data.page,_from:data.from,_to:data.to});
  if(error) throw new Error("Unable to load customer directory");
  return result as {rows:Record<string,any>[];total:number;page:number};
 });
