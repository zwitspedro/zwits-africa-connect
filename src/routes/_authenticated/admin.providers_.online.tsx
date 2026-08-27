import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, ArrowRight, RefreshCw, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { RoleGate } from "@/components/portal/role-gate";
import { listOnlineProviders } from "@/lib/admin-metrics.functions";
import { useProvidersRealtime } from "@/hooks/use-providers-realtime";

export const Route = createFileRoute("/_authenticated/admin/providers_/online")({
  head: () => ({ meta: [{ title: "Providers online — Zwits admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <OnlineProviders />
    </RoleGate>
  ),
});

function OnlineProviders() {
  const fetchOnline = useServerFn(listOnlineProviders);
  const live = useProvidersRealtime(true, "online-list");

  const list = useQuery({
    queryKey: ["admin-online-providers-list"],
    refetchInterval: live ? false : 30_000,
    queryFn: () => fetchOnline({ data: undefined }),
  });

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-wider text-primary">
          <ShieldCheck className="size-3" /> Admin
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold">Providers online</h1>
          <button
            onClick={() => list.refetch()}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-xs hover:bg-muted"
          >
            <RefreshCw className={`size-3.5 ${list.isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Approved providers with availability switched on right now — the exact records behind the
          dashboard tile.
        </p>

        {list.isLoading ? (
          <div className="mt-6 h-40 animate-pulse rounded-2xl bg-muted/50" />
        ) : list.error ? (
          <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Unable to load providers. {(list.error as Error).message}
            <button onClick={() => list.refetch()} className="ml-2 underline">
              Retry
            </button>
          </div>
        ) : (list.data?.rows ?? []).length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No providers are online right now.
          </p>
        ) : (
          <ul className="mt-6 grid gap-2">
            {(list.data?.rows ?? []).map((p: any) => (
              <li key={p.id} className="rounded-2xl border border-border/70 bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Activity className="size-4 text-emerald-400" />
                    {p.business_name}
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-400">
                    online · {p.verification_status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {p.category} · {p.city} · {Number(p.rating_avg ?? 0).toFixed(1)}★ (
                  {p.ratings_count ?? 0}) · {p.jobs_completed ?? 0} jobs
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Status updated {new Date(p.updated_at).toLocaleString()}
                </div>
                <Link
                  to="/admin/providers"
                  search={{ status: "approved", online: true }}
                  className="mt-2 inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] hover:bg-muted"
                >
                  Open in provider manager <ArrowRight className="size-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SiteShell>
  );
}
