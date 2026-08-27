import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminMetrics, getOnlineProvidersCount } from "@/lib/admin-metrics.functions";
import {
  ShieldCheck,
  Users,
  CalendarCheck,
  Wallet,
  Star,
  FileSearch,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Activity,
  Percent,
  RefreshCw,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { AuditExportButtons } from "@/components/audit-export-buttons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { RoleGate } from "@/components/portal/role-gate";
import { useProvidersRealtime } from "@/hooks/use-providers-realtime";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin dashboard — Zwits" }] }),
  component: AdminAdminDashboardRoute,
});

function AdminDashboard() {
  const { user } = useAuth();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const isAdmin = (roles ?? []).includes("admin");

  const fetchMetrics = useServerFn(getAdminMetrics);
  const fetchOnlineCount = useServerFn(getOnlineProvidersCount);
  const metricsQuery = useQuery({
    queryKey: ["admin-metrics"],
    enabled: !!user && isAdmin,
    refetchInterval: 60_000,
    queryFn: () => fetchMetrics({ data: undefined }),
  });
  const metrics = metricsQuery.data;
  const loading = metricsQuery.isLoading;
  const failed = !!metricsQuery.error;

  // Realtime first: provider row changes invalidate the count instantly.
  // Poll the single head-count query only while the channel is unavailable.
  const providersLive = useProvidersRealtime(!!user && isAdmin, "dash");
  const onlineQuery = useQuery({
    queryKey: ["admin-online-providers"],
    enabled: !!user && isAdmin,
    refetchInterval: providersLive ? false : 30_000,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
    queryFn: () => fetchOnlineCount({ data: undefined }),
  });

  // Data-light panels: small, bounded previews only — never full tables.
  const { data: audits } = useQuery({
    queryKey: ["admin-dash-audits"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_document_audits")
        .select("id, doc_key, file_name, status, created_at, provider_user_id")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const { data: revoked } = useQuery({
    queryKey: ["admin-dash-revoked"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id, business_name, category, city")
        .eq("verification_status", "revoked")
        .limit(5);
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
        .limit(6);
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

  const refreshAll = () => {
    void metricsQuery.refetch();
    void onlineQuery.refetch();
  };

  const onlineValue =
    onlineQuery.data?.count ?? (onlineQuery.error && failed ? undefined : metrics?.onlineProviders);
  const onlineState = onlineQuery.error && failed ? "error" : onlineValue == null ? "loading" : "ok";

  const state = (n: number | null | undefined): "loading" | "error" | "ok" =>
    failed ? "error" : loading || n == null ? "loading" : "ok";

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-wider text-primary">
              <ShieldCheck className="size-3" /> Admin
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold">Operations dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Every number below opens the records behind it.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={refreshAll}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-xs hover:bg-muted"
            >
              <RefreshCw className={`size-3.5 ${metricsQuery.isFetching ? "animate-spin" : ""}`} /> Refresh
            </button>
            <Link to="/admin/providers" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:opacity-90">
              <Users className="size-3.5" /> Manage providers
            </Link>
            <Link to="/admin/commissions" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-xs hover:bg-muted">
              <Percent className="size-3.5" /> Commissions
            </Link>
            <Link to="/admin/reconciliation" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-xs hover:bg-muted">
              <Wallet className="size-3.5" /> Reconciliation
            </Link>
            <Link to="/admin/email" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-xs hover:bg-muted">
              <Activity className="size-3.5" /> Email delivery
            </Link>
            <Link to="/admin/health" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-xs hover:bg-muted">
              <ShieldCheck className="size-3.5" /> Backend health
            </Link>
            <AuditExportButtons
              rows={audits as any}
              filenameBase="recent-audits"
              pdfTitle="Recent document audits"
              pdfSubtitle={`${audits?.length ?? 0} recent entries`}
              size="sm"
            />
          </div>
        </div>

        {failed && (
          <p className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Unable to load live metrics: {(metricsQuery.error as Error).message}
            <button onClick={refreshAll} className="underline">Retry</button>
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <KpiCard icon={Users} label="Approved providers" value={metrics?.approvedProviders} state={state(metrics?.approvedProviders)} sub={`${metrics?.pendingVerification ?? 0} pending · ${metrics?.revokedProviders ?? 0} revoked`} tone="emerald" to="/admin/providers" search={{ status: "approved" }} cta="View providers" />
          <KpiCard icon={CalendarCheck} label="Active bookings" value={metrics?.activeJobs} state={state(metrics?.activeJobs)} sub={`${metrics?.completedJobs ?? 0} completed`} tone="primary" to="/admin/reconciliation" cta="View bookings" />
          <KpiCard icon={Wallet} label="Gross revenue" value={metrics ? `$${metrics.revenue.toFixed(0)}` : undefined} state={state(metrics?.revenue)} sub={`Commission $${(metrics?.commission ?? 0).toFixed(0)}`} tone="primary" to="/admin/reconciliation" cta="View ledger" />
          <KpiCard icon={Star} label="Avg rating" value={metrics ? (metrics.avgRating ?? "—") : undefined} state={failed ? "error" : loading ? "loading" : "ok"} sub={`${metrics?.ratingsCount ?? 0} reviews`} tone="amber" to="/admin/providers" search={{ status: "approved" }} cta="View providers" />
          <KpiCard icon={Activity} label="Providers online" value={onlineValue} state={onlineState} sub={`${metrics?.providers ?? 0} total providers · live`} tone="primary" to="/admin/providers/online" cta="View online providers" />
          <KpiCard icon={AlertTriangle} label="Open disputes" value={metrics?.openDisputes} state={state(metrics?.openDisputes)} sub="Awaiting resolution" tone={(metrics?.openDisputes ?? 0) > 0 ? "destructive" : "muted"} to="/admin/disputes" cta="View disputes" />
          <KpiCard icon={Wallet} label="Pending withdrawals" value={metrics?.pendingWithdrawals} state={state(metrics?.pendingWithdrawals)} sub="Requested or processing" tone={(metrics?.pendingWithdrawals ?? 0) > 0 ? "amber" : "muted"} to="/admin/withdrawals" cta="View withdrawals" />
          <KpiCard icon={AlertTriangle} label="Failed payments" value={metrics?.failedPayments} state={state(metrics?.failedPayments)} sub="Needs follow-up" tone={(metrics?.failedPayments ?? 0) > 0 ? "destructive" : "muted"} to="/admin/payments" search={{ status: "failed" }} cta="View payments" />
          <KpiCard icon={FileSearch} label="Audit events" value={metrics?.auditEvents} state={state(metrics?.auditEvents)} sub="Privileged actions" tone="primary" to="/admin/audit" cta="View audit log" />
          <KpiCard icon={AlertTriangle} label="Failed uploads" value={metrics?.failedUploads} state={state(metrics?.failedUploads)} sub="Rejected or errored" tone={(metrics?.failedUploads ?? 0) > 0 ? "destructive" : "muted"} to="/admin/uploads" cta="View uploads" />
          <KpiCard icon={ShieldCheck} label="Pending review" value={metrics?.pendingVerification} state={state(metrics?.pendingVerification)} sub="Awaiting verification" tone={(metrics?.pendingVerification ?? 0) > 0 ? "amber" : "muted"} to="/admin/review" cta="View pending" />
          <KpiCard icon={Users} label="Customers" value={metrics?.customers} state={state(metrics?.customers)} sub="Registered accounts" tone="primary" to="/admin/customers" cta="View customers" />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Panel title="Recent document uploads" link={{ to: "/admin/uploads", label: "Open" }} className="lg:col-span-2">
            {(audits ?? []).length === 0 && <Empty>No upload activity yet.</Empty>}
            <ul className="grid gap-1.5">
              {(audits ?? []).map((a: any) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-[11px]">
                  <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                  <span className="font-medium">{a.doc_key}</span>
                  <StatusChip status={a.status} />
                  <span className="max-w-[30%] truncate text-muted-foreground">{a.file_name ?? "—"}</span>
                  <Link
                    to={a.status === "rejected" || a.status === "upload_error" ? "/admin/uploads" : "/admin/providers"}
                    search={a.status === "rejected" || a.status === "upload_error" ? undefined : ({ status: "pending" } as any)}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] hover:bg-muted"
                  >
                    Open <ArrowRight className="size-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Revoked providers" link={{ to: "/admin/providers", label: "Review", search: { status: "revoked" } }}>
            {(revoked ?? []).length === 0 && <Empty>No revoked providers.</Empty>}
            <ul className="grid gap-1.5">
              {(revoked ?? []).map((p: any) => (
                <li key={p.id} className="rounded-lg bg-muted/30 px-3 py-2 text-[11px]">
                  <div className="font-medium">{p.business_name}</div>
                  <div className="text-muted-foreground">{p.category} · {p.city}</div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Latest bookings" link={{ to: "/admin/reconciliation", label: "Open" }} className="lg:col-span-3">
            {(bookings ?? []).length === 0 && <Empty>No bookings yet.</Empty>}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1.5 pr-3">When</th>
                    <th className="py-1.5 pr-3">Category</th>
                    <th className="py-1.5 pr-3">Status</th>
                    <th className="py-1.5 pr-3">Payment</th>
                    <th className="py-1.5 pr-3 text-right">Price</th>
                    <th className="py-1.5 pr-3 text-right">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {(bookings ?? []).map((b: any) => (
                    <tr key={b.id} className="border-t border-border/60">
                      <td className="py-1.5 pr-3 text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
                      <td className="py-1.5 pr-3">{b.category}</td>
                      <td className="py-1.5 pr-3"><StatusChip status={String(b.status)} /></td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{b.payment_status}</td>
                      <td className="py-1.5 pr-3 text-right">${Number(b.price ?? 0).toFixed(0)}</td>
                      <td className="py-1.5 pr-3 text-right">
                        <Link
                          to="/admin/reconciliation/booking/$bookingId"
                          params={{ bookingId: b.id }}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Open <ArrowRight className="size-3" />
                        </Link>
                      </td>
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
  state = "ok",
  sub,
  tone = "primary",
  to,
  search,
  cta,
}: {
  icon: typeof Users;
  label: string;
  value?: string | number | null;
  state?: "loading" | "error" | "ok";
  sub?: string;
  tone?: "primary" | "emerald" | "amber" | "destructive" | "muted";
  to: string;
  search?: Record<string, unknown>;
  cta?: string;
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
      aria-label={`${label}: ${state === "ok" ? value : state === "error" ? "unable to load" : "loading"}. ${cta ?? "View records"}.`}
      className="group block min-h-[112px] rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
    >
      <div className="flex items-start justify-between">
        <div className={`inline-flex size-8 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="size-4" />
        </div>
        <ArrowUpRight className="size-3.5 text-muted-foreground/40 transition group-hover:text-primary" />
      </div>
      {state === "loading" ? (
        <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted" />
      ) : state === "error" ? (
        <div className="mt-3 text-sm font-medium text-destructive">Unable to load</div>
      ) : (
        <div className="mt-3 text-2xl font-semibold">{value}</div>
      )}
      <div className="text-xs text-muted-foreground">{label}</div>
      {state === "ok" && sub && (
        <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/80">{sub}</div>
      )}
      <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary">
        {cta ?? "View records"} <ArrowRight className="size-3" />
      </div>
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
  link?: { to: string; label: string; search?: Record<string, unknown> };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {link && (
          <Link to={link.to as any} search={link.search as any} className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
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
