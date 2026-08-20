import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { RoleGate } from "@/components/portal/role-gate";
import { getBackendHealth } from "@/lib/health.functions";

export const Route = createFileRoute("/_authenticated/admin/health")({
  head: () => ({
    meta: [
      { title: "Backend health — Zwits admin" },
      {
        name: "description",
        content: "Internal Zwits diagnostics: database, auth, storage, payments, email and realtime status.",
      },
      { property: "og:title", content: "Backend health — Zwits admin" },
      { property: "og:description", content: "Internal Zwits backend diagnostics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate role="admin">
      <BackendHealthPage />
    </RoleGate>
  ),
});

function Dot({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="size-4 text-primary" />
  ) : (
    <XCircle className="size-4 text-destructive" />
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

function when(value: string | null) {
  return value ? new Date(value).toLocaleString() : "never";
}

function BackendHealthPage() {
  const fetchHealth = useServerFn(getBackendHealth);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["backend-health"],
    refetchInterval: 60_000,
    queryFn: () => fetchHealth({ data: undefined }),
  });

  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Admin dashboard
        </Link>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Backend health</h1>
            <p className="text-sm text-muted-foreground">
              Internal diagnostics. No credentials are ever shown here.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-full border border-border px-4 py-2 text-xs hover:bg-muted"
          >
            {isFetching ? "Checking…" : "Re-check"}
          </button>
        </div>

        {isLoading && (
          <div className="grid place-items-center py-20 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
        {error && (
          <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {(error as Error).message}
          </p>
        )}

        {data && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Core services">
              {(["database", "auth", "storage"] as const).map((k) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 capitalize text-foreground">
                    <Dot ok={data.services[k].ok} /> {k}
                  </span>
                  <span>
                    {data.services[k].ok ? `${data.services[k].ms} ms` : data.services[k].detail}
                  </span>
                </div>
              ))}
            </Card>

            <Card title="Storage buckets">
              {data.storageBuckets.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3">
                  <span className="text-foreground">{b.id}</span>
                  <span>{b.public ? "public" : "private (signed URLs)"}</span>
                </div>
              ))}
            </Card>

            <Card title="Payment rails">
              {data.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-foreground">
                    <Dot ok={p.available} /> {p.label}
                  </span>
                  <span>{p.available ? "connected" : "not connected"}</span>
                </div>
              ))}
            </Card>

            <Card title="Email delivery (24h)">
              <div className="flex justify-between"><span>Sent</span><span>{data.email.sentLast24h}</span></div>
              <div className="flex justify-between"><span>Failed</span><span>{data.email.failedLast24h}</span></div>
              <div className="flex justify-between">
                <span>Throttled until</span>
                <span>{when(data.email.throttledUntil)}</span>
              </div>
            </Card>

            <Card title="Realtime channels">
              <p>{data.realtime.tables.join(", ")}</p>
            </Card>

            <Card title="Activity (24h)">
              <div className="flex justify-between"><span>Bookings created</span><span>{data.activity.bookingsLast24h}</span></div>
              <div className="flex justify-between"><span>Payments paid</span><span>{data.activity.paymentsPaidLast24h}</span></div>
              <div className="flex justify-between"><span>Payments failed</span><span>{data.activity.paymentsFailedLast24h}</span></div>
              <div className="flex justify-between"><span>Ledger entries</span><span>{data.activity.ledgerEntriesLast24h}</span></div>
            </Card>

            <Card title="Last successful operations">
              <div className="flex justify-between"><span>Booking</span><span>{when(data.activity.lastBooking)}</span></div>
              <div className="flex justify-between"><span>Payment</span><span>{when(data.activity.lastPayment)}</span></div>
              <div className="flex justify-between"><span>Wallet entry</span><span>{when(data.activity.lastWalletTransaction)}</span></div>
              <div className="flex justify-between"><span>Notification</span><span>{when(data.activity.lastNotification)}</span></div>
              <div className="flex justify-between"><span>Email</span><span>{when(data.activity.lastEmail)}</span></div>
              <div className="flex justify-between"><span>Admin action</span><span>{when(data.activity.lastAdminAction)}</span></div>
            </Card>

            <Card title="Checked">
              <p>{new Date(data.checkedAt).toLocaleString()}</p>
            </Card>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
