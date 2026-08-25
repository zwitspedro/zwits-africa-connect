import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, Banknote, Loader2, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { RoleGate } from "@/components/portal/role-gate";
import { listDisputes, resolveDispute } from "@/lib/disputes.functions";
import { listWithdrawals, settleWithdrawal } from "@/lib/wallet.functions";

type Search = { tab?: "disputes" | "withdrawals" };

export const Route = createFileRoute("/_authenticated/admin/operations")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: s.tab === "withdrawals" ? "withdrawals" : s.tab === "disputes" ? "disputes" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Disputes & payouts — Zwits admin" },
      {
        name: "description",
        content: "Resolve customer disputes and settle provider withdrawal requests on Zwits.",
      },
      { property: "og:title", content: "Disputes & payouts — Zwits admin" },
      {
        property: "og:description",
        content: "Resolve customer disputes and settle provider withdrawal requests on Zwits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate role="admin">
      <OperationsPage />
    </RoleGate>
  ),
});

const money = (n: any) => `$${Number(n ?? 0).toFixed(2)}`;

function OperationsPage() {
  const { tab } = Route.useSearch();
  const active = tab ?? "disputes";

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-wider text-primary">
          <ShieldCheck className="size-3" /> Admin
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold">Disputes &amp; payouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything here writes to the ledger — adjustments and refunds are auditable.
        </p>

        <div className="mt-5 inline-flex gap-1 rounded-full bg-muted p-1 text-xs">
          <Link
            to="/admin/operations"
            search={{ tab: "disputes" }}
            className={`rounded-full px-4 py-1.5 ${
              active === "disputes" ? "bg-background font-semibold shadow-sm" : "text-muted-foreground"
            }`}
          >
            Open disputes
          </Link>
          <Link
            to="/admin/operations"
            search={{ tab: "withdrawals" }}
            className={`rounded-full px-4 py-1.5 ${
              active === "withdrawals" ? "bg-background font-semibold shadow-sm" : "text-muted-foreground"
            }`}
          >
            Withdrawal queue
          </Link>
        </div>

        <div className="mt-6 grid gap-6">
          {active === "disputes" ? <DisputesPanel /> : <WithdrawalsPanel />}
        </div>
      </section>
    </SiteShell>
  );
}

function DisputesPanel() {
  const qc = useQueryClient();
  const fetchDisputes = useServerFn(listDisputes);
  const resolve = useServerFn(resolveDispute);
  const [openId, setOpenId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [refund, setRefund] = useState("");

  const disputes = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: () => fetchDisputes({ data: { page: 0 } }),
  });

  const act = useMutation({
    mutationFn: (vars: { id: string; status: "investigating" | "resolved" | "rejected" }) =>
      resolve({
        data: {
          disputeId: vars.id,
          status: vars.status,
          resolution: resolution.trim() || null,
          refundProviderEarnings: refund ? Number(refund) : undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Dispute updated");
      setOpenId(null);
      setResolution("");
      setRefund("");
      void qc.invalidateQueries({ queryKey: ["admin-disputes"] });
      void qc.invalidateQueries({ queryKey: ["admin-metrics"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not update dispute"),
  });

  const rows = (disputes.data?.rows ?? []).filter((d: any) =>
    ["open", "investigating"].includes(d.status),
  );

  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-destructive" />
        <h2 className="font-display text-lg font-semibold">Open disputes</h2>
      </div>

      {disputes.isLoading ? (
        <div className="mt-4 h-16 animate-pulse rounded-2xl bg-muted/50" />
      ) : disputes.error ? (
        <p className="mt-4 text-sm text-destructive">{(disputes.error as Error).message}</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nothing to resolve right now.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {rows.map((d: any) => (
            <li key={d.id} className="rounded-2xl border border-border/70 bg-background/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium">{d.reason}</div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize">
                  {d.status}
                </span>
              </div>
              {d.description && (
                <p className="mt-1 text-xs text-muted-foreground">{d.description}</p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                Booking {String(d.booking_id).slice(0, 8).toUpperCase()} ·{" "}
                {new Date(d.created_at).toLocaleString()}
              </p>

              {openId === d.id ? (
                <div className="mt-3 grid gap-2">
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={2}
                    placeholder="Resolution notes shared with the customer"
                    className="rounded-xl border border-border bg-background p-3 text-sm"
                  />
                  <input
                    value={refund}
                    inputMode="decimal"
                    onChange={(e) => setRefund(e.target.value)}
                    placeholder="Reverse provider earnings (optional, $)"
                    className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={act.isPending}
                      onClick={() => act.mutate({ id: d.id, status: "resolved" })}
                      className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
                    >
                      {act.isPending ? "Saving…" : "Resolve"}
                    </button>
                    <button
                      disabled={act.isPending}
                      onClick={() => act.mutate({ id: d.id, status: "rejected" })}
                      className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
                    >
                      Reject
                    </button>
                    <button
                      disabled={act.isPending}
                      onClick={() => act.mutate({ id: d.id, status: "investigating" })}
                      className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
                    >
                      Mark investigating
                    </button>
                    <button
                      onClick={() => setOpenId(null)}
                      className="rounded-full px-4 py-2 text-xs text-muted-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setOpenId(d.id)}
                  className="mt-3 rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Review
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WithdrawalsPanel() {
  const qc = useQueryClient();
  const fetchWithdrawals = useServerFn(listWithdrawals);
  const settle = useServerFn(settleWithdrawal);
  const [status, setStatus] = useState<"requested" | "processing" | "all">("requested");

  const list = useQuery({
    queryKey: ["admin-withdrawals", status],
    queryFn: () => fetchWithdrawals({ data: { status } }),
  });

  const act = useMutation({
    mutationFn: (vars: {
      id: string;
      outcome: "processing" | "paid" | "failed" | "cancelled";
      reason?: string;
    }) =>
      settle({
        data: { withdrawalId: vars.id, outcome: vars.outcome, reason: vars.reason ?? null },
      }),
    onSuccess: () => {
      toast.success("Withdrawal updated");
      void qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      void qc.invalidateQueries({ queryKey: ["admin-metrics"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not update withdrawal"),
  });

  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Banknote className="size-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Withdrawal queue</h2>
        </div>
        <div className="flex gap-1 rounded-full bg-muted p-1 text-xs">
          {(["requested", "processing", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1 capitalize ${
                status === s ? "bg-background font-semibold shadow-sm" : "text-muted-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {list.isLoading ? (
        <div className="mt-4 h-16 animate-pulse rounded-2xl bg-muted/50" />
      ) : list.error ? (
        <p className="mt-4 text-sm text-destructive">{(list.error as Error).message}</p>
      ) : (list.data ?? []).length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No withdrawals in this state.</p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {(list.data ?? []).map((w: any) => (
            <li
              key={w.id}
              className="grid gap-2 rounded-2xl border border-border/70 bg-background/50 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium capitalize">
                  {money(w.amount)} · {String(w.method).replace("_", " ")}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {w.destination} · {new Date(w.created_at).toLocaleString()} ·{" "}
                  <span className="capitalize">{w.status}</span>
                </div>
              </div>
              {["requested", "processing"].includes(w.status) && (
                <div className="flex flex-wrap gap-2">
                  {w.status === "requested" && (
                    <button
                      disabled={act.isPending}
                      onClick={() => act.mutate({ id: w.id, outcome: "processing" })}
                      className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"
                    >
                      Processing
                    </button>
                  )}
                  <button
                    disabled={act.isPending}
                    onClick={() => act.mutate({ id: w.id, outcome: "paid" })}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
                  >
                    {act.isPending && <Loader2 className="size-3 animate-spin" />} Mark paid
                  </button>
                  <button
                    disabled={act.isPending}
                    onClick={() => {
                      const reason = window.prompt("Why did this payout fail?") ?? undefined;
                      act.mutate({ id: w.id, outcome: "failed", reason });
                    }}
                    className="rounded-full border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    Failed
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
