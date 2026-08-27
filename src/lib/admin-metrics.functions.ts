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
      auditEvents,
      failedUploads,
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
      count("admin_audit_log"),
      count("provider_document_audits", (q) => q.in("status", ["rejected", "upload_error"])),
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

    const { data: ratingRows } = await db.from("ratings").select("rating").limit(10000);
    const ratingsCount = (ratingRows ?? []).length;
    const avgRating = ratingsCount
      ? Math.round(
          ((ratingRows ?? []).reduce((s: number, r: any) => s + Number(r.rating ?? 0), 0) /
            ratingsCount) *
            100,
        ) / 100
      : null;

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
      auditEvents,
      failedUploads,
      approvedProviders: await count("providers", (q) =>
        q.eq("verification_status", "approved"),
      ),
      revokedProviders: await count("providers", (q) => q.eq("verification_status", "revoked")),
      avgRating,
      ratingsCount,
      revenue: Math.round(revenue * 100) / 100,
      providerEarnings: Math.round(providerEarnings * 100) / 100,
      commission: Math.round((revenue - providerEarnings) * 100) / 100,
    };
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

/** Paginated, searchable customer directory for admins. */
export const listAdminCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        search: z.string().max(80).optional(),
        page: z.number().int().min(0).max(500).default(0),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: roleRows, error: roleErr } = await db
      .from("user_roles")
      .select("user_id")
      .eq("role", "customer")
      .limit(10000);
    if (roleErr) throw new Error(roleErr.message);
    const ids = [...new Set((roleRows ?? []).map((r: any) => r.user_id))];
    if (ids.length === 0) return { rows: [], total: 0, page: data.page };

    const size = 25;
    const from = data.page * size;
    let q = db
      .from("profiles")
      .select("user_id, display_name, phone, city, country, account_type, created_at, updated_at", {
        count: "exact",
      })
      .in("user_id", ids)
      .order("created_at", { ascending: false })
      .range(from, from + size - 1);
    const term = data.search ? cleanTerm(data.search) : "";
    if (term) q = q.or(`display_name.ilike.%${term}%,phone.ilike.%${term}%`);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    const pageIds = (rows ?? []).map((r: any) => r.user_id);
    const bookingCounts: Record<string, number> = {};
    if (pageIds.length) {
      const { data: bk } = await db
        .from("bookings")
        .select("customer_id")
        .in("customer_id", pageIds)
        .limit(5000);
      for (const b of bk ?? []) {
        bookingCounts[b.customer_id] = (bookingCounts[b.customer_id] ?? 0) + 1;
      }
    }
    return {
      rows: (rows ?? []).map((r: any) => ({
        ...r,
        bookings_count: bookingCounts[r.user_id] ?? 0,
      })),
      total: count ?? 0,
      page: data.page,
    };
  });
