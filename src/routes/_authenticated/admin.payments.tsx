import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CreditCard, ShieldCheck, ArrowRight } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { RoleGate } from "@/components/portal/role-gate";
import { listAdminPayments } from "@/lib/admin-metrics.functions";

type Search = { status?: string };

export const Route = createFileRoute("/_authenticated/admin/payments")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    status: typeof s.status === "string" ? s.status : undefined,
  }),
  head: () => ({ meta: [{ title: "Payments — Zwits admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <AdminPayments />
    </RoleGate>
  ),
});

const TABS = ["failed", "pending", "paid", "all"] as const;
const money = (n: any, c?: string) => `${c === "USD" || !c ? "$" : `${c} `}${Number(n ?? 0).toFixed(2)}`;

function AdminPayments() {
  const { status } = Route.useSearch();
  const active = (status ?? "failed") as (typeof TABS)[number];
  const [page, setPage] = useState(0);

  const fetchPayments = useServerFn(listAdminPayments);
  const list = useQuery({
    queryKey: ["admin-payments", active, page],
    queryFn: () => fetchPayments({ data: { status: active, page } }),
  });

  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-wider text-primary">
          <ShieldCheck className="size-3" /> Admin
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {active === "failed"
            ? "Payments that failed and need follow-up. Statuses are server-authoritative — a failed payment can only change through the payment verification flow."
            : "All platform payments, newest first."}
        </p>

        <div className="mt-5 flex flex-wrap gap-1 rounded-full bg-muted p-1 text-xs sm:inline-flex">
          {TABS.map((t) => (
            <Link
              key={t}
              to="/admin/payments"
              search={{ status: t }}
              onClick={() => setPage(0)}
              className={`rounded-full px-3 py-1 capitalize ${
                active === t ? "bg-background font-semibold shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t}
            </Link>
          ))}
        </div>

        {list.isLoading ? (
          <div className="mt-6 h-40 animate-pulse rounded-2xl bg-muted/50" />
        ) : list.error ? (
          <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {(list.error as Error).message}{" "}
            <button onClick={() => list.refetch()} className="ml-2 underline">
              Retry
            </button>
          </div>
        ) : (list.data?.rows ?? []).length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {active === "failed" ? "No failed payments." : "No payments in this state."}
          </p>
        ) : (
          <ul className="mt-6 grid gap-2">
            {(list.data?.rows ?? []).map((p: any) => (
              <li
                key={p.id}
                className="rounded-2xl border border-border/70 bg-card p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-medium">
                    <CreditCard className="size-4 text-muted-foreground" />
                    {money(p.amount, p.currency)}
                    <span className="text-xs text-muted-foreground">
                      · {String(p.payment_method).replace("_", " ")}
                      {p.provider ? ` via ${p.provider}` : ""}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                      p.status === "paid"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : p.status === "failed"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {p.customer_name ?? "Customer"} · {new Date(p.created_at).toLocaleString()} · Ref{" "}
                  {String(p.id).slice(0, 8).toUpperCase()}
                </div>
                {p.failure_reason && (
                  <div className="mt-1 text-xs text-destructive">Reason: {p.failure_reason}</div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.booking_id && (
                    <Link
                      to="/admin/reconciliation/booking/$bookingId"
                      params={{ bookingId: p.booking_id }}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] hover:bg-muted"
                    >
                      Open booking <ArrowRight className="size-3" />
                    </Link>
                  )}
                  {p.delivery_id && (
                    <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                      Delivery {String(p.delivery_id).slice(0, 8).toUpperCase()}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-full border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {page + 1} of {pages} · {total} payments
            </span>
            <button
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-full border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </SiteShell>
  );
}
