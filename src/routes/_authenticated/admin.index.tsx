import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminMetrics } from "@/lib/admin-metrics.functions";
import { ShieldCheck, Users, CalendarCheck, Wallet, Star, FileSearch, AlertTriangle, ArrowRight, ArrowUpRight, Activity, Percent } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { AuditExportButtons } from "@/components/audit-export-buttons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { RoleGate } from "@/components/portal/role-gate";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin dashboard — Zwits" }] }),
  component: AdminAdminDashboardRoute,
});

function AdminDashboard() {
  const { user } = useAuth();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const isAdmin = (roles ?? []).includes("admin");

  const fetchMetrics = useServerFn(getAdminMetrics);
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
  } = useQuery({
    queryKey: ["admin-metrics"],
    enabled: !!user && isAdmin,
    refetchInterval: 60_000,
    queryFn: () => fetchMetrics({ data: undefined }),
  });

  const { data: providers } = useQuery({
    queryKey: ["admin-dash-providers"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id,business_name,category,city,verification_status,rating_avg,ratings_count,jobs_completed,created_at,user_id");
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["admin-dash-bookings"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id,status,price,category,created_at,payment_status")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: audits } = useQuery({
    queryKey: ["admin-dash-audits"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_document_audits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: ratings } = useQuery({
    queryKey: ["admin-dash-ratings"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ratings")
        .select("rating,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  if (rolesLoading) {
    return <SiteShell><div className="p-10 text-sm text-muted-foreground">Loading…</div></SiteShell>;
  }
  if (!isAdmin) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">You don't have access to this page.</p>
        </section>
      </SiteShell>
    );
  }

  const byStatus = (key: string) => (providers ?? []).filter((p) => p.verification_status === key).length;
  const pendingProviders = byStatus("pending") + byStatus("submitted") + byStatus("unverified");
  const approvedProviders = byStatus("approved");
  const revokedProviders = byStatus("revoked");

  const activeBookings = (bookings ?? []).filter((b) => ["pending", "accepted", "in_progress"].includes(b.status as string)).length;
  const completedBookings = (bookings ?? []).filter((b) => b.status === "completed");
  const grossRevenue = completedBookings.reduce((sum, b) => sum + Number(b.price ?? 0), 0);

  const avgRating = ratings && ratings.length
    ? (ratings.reduce((s, r) => s + Number(r.rating ?? 0), 0) / ratings.length).toFixed(2)
    : "—";

  const failedAudits = (audits ?? []).filter((a) => a.status === "rejected" || a.status === "upload_error").length;
  const recentAudits = (audits ?? []).slice(0, 8);
  const recentBookings = (bookings ?? []).slice(0, 6);
  const flaggedProviders = (providers ?? []).filter((p) => p.verification_status === "revoked").slice(0, 5);

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-wider text-primary">
              <ShieldCheck className="size-3" /> Admin
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold">Operations dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Live overview of providers, bookings and verification activity.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/providers" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground hover:opacity-90">
              <Users className="size-3.5" /> Manage providers
            </Link>
            <Link to="/admin/commissions" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs hover:bg-muted">
              <Percent className="size-3.5" /> Commissions
            </Link>
            <Link to="/admin/reconciliation" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs hover:bg-muted">
              <Wallet className="size-3.5" /> Reconciliation
            </Link>
            <Link to="/admin/operations" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs hover:bg-muted">
              <Wallet className="size-3.5" /> Disputes &amp; payouts
            </Link>
            <Link to="/admin/email" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs hover:bg-muted">
              <Activity className="size-3.5" /> Email delivery
            </Link>
            <Link to="/admin/health" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs hover:bg-muted">
              <ShieldCheck className="size-3.5" /> Backend health
            </Link>
            <AuditExportButtons
              rows={audits as any}
              filenameBase="recent-audits"
              pdfTitle="Recent document audits"
              pdfSubtitle={`${audits?.length ?? 0} entries (latest 200)`}
              size="sm"
            />
          </div>
        </div>

        {metricsError && (
          <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Could not load live metrics: {(metricsError as Error).message}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <KpiCard icon={Users} label="Approved providers" value={metricsLoading ? "…" : approvedProviders} sub={`${metrics?.pendingVerification ?? pendingProviders} pending · ${revokedProviders} revoked`} tone="emerald" to="/admin/providers" search={{ status: "approved" }} />
          <KpiCard icon={CalendarCheck} label="Active bookings" value={metricsLoading ? "…" : (metrics?.activeJobs ?? activeBookings)} sub={`${metrics?.completedJobs ?? completedBookings.length} completed`} tone="primary" to="/admin/reconciliation" />
          <KpiCard icon={Wallet} label="Gross revenue" value={metricsLoading ? "…" : `$${(metrics?.revenue ?? 0).toFixed(0)}`} sub={`Commission $${(metrics?.commission ?? 0).toFixed(0)}`} tone="primary" to="/admin/reconciliation" />
          <KpiCard icon={Star} label="Avg rating" value={avgRating} sub={`${ratings?.length ?? 0} reviews`} tone="amber" to="/admin/providers" search={{ status: "approved" }} />
          <KpiCard icon={Activity} label="Providers online" value={metricsLoading ? "…" : (metrics?.onlineProviders ?? 0)} sub={`${metrics?.providers ?? 0} total providers`} tone="primary" to="/admin/providers" search={{ online: true }} />
          <KpiCard icon={AlertTriangle} label="Open disputes" value={metricsLoading ? "…" : (metrics?.openDisputes ?? 0)} sub="Awaiting resolution" tone={(metrics?.openDisputes ?? 0) > 0 ? "destructive" : "muted"} to="/admin/operations" search={{ tab: "disputes" }} />
          <KpiCard icon={Wallet} label="Pending withdrawals" value={metricsLoading ? "…" : (metrics?.pendingWithdrawals ?? 0)} sub="Requested or processing" tone={(metrics?.pendingWithdrawals ?? 0) > 0 ? "amber" : "muted"} to="/admin/operations" search={{ tab: "withdrawals" }} />
          <KpiCard icon={AlertTriangle} label="Failed payments" value={metricsLoading ? "…" : (metrics?.failedPayments ?? 0)} sub="Needs follow-up" tone={(metrics?.failedPayments ?? 0) > 0 ? "destructive" : "muted"} to="/admin/payments" search={{ status: "failed" }} />
          <KpiCard icon={FileSearch} label="Audit events" value={audits?.length ?? 0} sub="Latest 200" tone="primary" to="/admin/audit" />
          <KpiCard icon={AlertTriangle} label="Failed uploads" value={failedAudits} sub="Rejected or errored" tone={failedAudits > 0 ? "destructive" : "muted"} to="/admin/uploads" />
          <KpiCard icon={ShieldCheck} label="Pending review" value={metrics?.pendingVerification ?? pendingProviders} sub="Awaiting verification" tone={(metrics?.pendingVerification ?? pendingProviders) > 0 ? "amber" : "muted"} to="/admin/providers" search={{ status: "pending" }} />
          <KpiCard icon={Users} label="Customers" value={metricsLoading ? "…" : (metrics?.customers ?? 0)} sub="Registered accounts" tone="primary" to="/admin/customers" />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Panel title="Recent audit activity" link={{ to: "/admin/uploads", label: "Open" }} className="lg:col-span-2">
            {recentAudits.length === 0 && <Empty>No audit activity yet.</Empty>}
            <ul className="grid gap-1.5">
              {recentAudits.map((a: any) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-[11px]">
                  <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                  <span className="font-medium">{a.doc_key}</span>
                  <StatusChip status={a.status} />
                  <span className="max-w-[40%] truncate text-muted-foreground">{a.file_name ?? "—"}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Revoked providers" link={{ to: "/admin/providers", label: "Review" }}>
            {flaggedProviders.length === 0 && <Empty>No revoked providers.</Empty>}
            <ul className="grid gap-1.5">
              {flaggedProviders.map((p) => (
                <li key={p.id} className="rounded-lg bg-muted/30 px-3 py-2 text-[11px]">
                  <div className="font-medium">{p.business_name}</div>
                  <div className="text-muted-foreground">{p.category} · {p.city}</div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Latest bookings" className="lg:col-span-3">
            {recentBookings.length === 0 && <Empty>No bookings yet.</Empty>}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1.5 pr-3">When</th>
                    <th className="py-1.5 pr-3">Category</th>
                    <th className="py-1.5 pr-3">Status</th>
                    <th className="py-1.5 pr-3">Payment</th>
                    <th className="py-1.5 pr-3 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => (
                    <tr key={b.id} className="border-t border-border/60">
                      <td className="py-1.5 pr-3 text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
                      <td className="py-1.5 pr-3">{b.category}</td>
                      <td className="py-1.5 pr-3"><StatusChip status={String(b.status)} /></td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{b.payment_status}</td>
                      <td className="py-1.5 pr-3 text-right">${Number(b.price ?? 0).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </section>
    </SiteShell>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "primary",
  to,
  search,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  sub?: string;
  tone?: "primary" | "emerald" | "amber" | "destructive" | "muted";
  to: string;
  search?: Record<string, unknown>;
}) {
  const toneClass = {
    primary: "text-primary bg-primary/10",
    emerald: "text-emerald-400 bg-emerald-500/15",
    amber: "text-amber-400 bg-amber-500/15",
    destructive: "text-destructive bg-destructive/15",
    muted: "text-muted-foreground bg-muted",
  }[tone];
  return (
    <Link
      to={to as any}
      search={search as any}
      aria-label={`${label}: ${value}. View records.`}
      className="group block rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
    >
      <div className="flex items-start justify-between">
        <div className={`inline-flex size-8 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="size-4" />
        </div>
        <ArrowUpRight className="size-3.5 text-muted-foreground/40 transition group-hover:text-primary" />
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {sub && <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/80">{sub}</div>}
    </Link>
  );
}

function Panel({
  title,
  link,
  className = "",
  children,
}: {
  title: string;
  link?: { to: string; label: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {link && (
          <Link to={link.to} className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
            {link.label} <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-[11px] text-muted-foreground">{children}</p>;
}

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "uploaded" || status === "completed" || status === "approved" || status === "accepted"
      ? "bg-emerald-500/15 text-emerald-400"
      : status === "rejected" || status === "upload_error" || status === "cancelled" || status === "revoked"
      ? "bg-destructive/15 text-destructive"
      : status === "in_progress" || status === "pending"
      ? "bg-amber-500/15 text-amber-400"
      : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${tone}`}>{status}</span>;
}

function AdminAdminDashboardRoute() {
  return (
    <RoleGate role="admin">
      <AdminDashboard />
    </RoleGate>
  );
}
