import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Users } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { DiscrepancyBanner, type DiscrepancyIssue } from "@/components/discrepancy-banner";
import { RoleGate } from "@/components/portal/role-gate";

export const Route = createFileRoute(
  "/_authenticated/admin/reconciliation/provider/$providerId",
)({
  validateSearch: (s: Record<string, unknown>) => ({
    from: typeof s.from === "string" ? s.from : undefined,
    to: typeof s.to === "string" ? s.to : undefined,
  }),
  head: () => ({ meta: [{ title: "Provider payout breakdown — Admin — Zwits" }] }),
  component: AdminProviderBreakdownRoute,
});

type Rate = { category: string; percent: number; min_fee: number; active: boolean };
type Booking = {
  id: string;
  category: string;
  price: number | null;
  payment_status: string | null;
  updated_at: string;
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return { from: isoDate(start), to: isoDate(end) };
}

function ProviderBreakdown() {
  const { providerId } = Route.useParams();
  const search = Route.useSearch();
  const def = defaultRange();
  const [from, setFrom] = useState(search.from ?? def.from);
  const [to, setTo] = useState(search.to ?? def.to);

  const { user } = useAuth();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const isAdmin = (roles ?? []).includes("admin");

  const { data: provider } = useQuery({
    queryKey: ["recon-provider", providerId],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id,business_name,user_id,city,category,hourly_rate,rating_avg,jobs_completed")
        .eq("id", providerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["recon-provider-bookings", providerId, from, to],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const start = new Date(`${from}T00:00:00`).toISOString();
      const end = new Date(`${to}T23:59:59.999`).toISOString();
      const { data, error } = await supabase
        .from("bookings")
        .select("id,category,price,payment_status,updated_at")
        .eq("provider_id", providerId)
        .eq("status", "completed")
        .gte("updated_at", start)
        .lte("updated_at", end)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
  });

  const { data: rates } = useQuery({
    queryKey: ["recon-rates-all"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_rates")
        .select("category,percent,min_fee,active");
      if (error) throw error;
      return data as Rate[];
    },
  });

  const rateByCategory = useMemo(() => {
    const m = new Map<string, Rate>();
    (rates ?? []).filter((r) => r.active).forEach((r) => m.set(r.category, r));
    return m;
  }, [rates]);

  type CatCalc = {
    count: number;
    gross: number;
    percentFee: number;
    minFeeTotal: number;
    rawCommission: number;
    capAdjustment: number;
    commission: number;
    net: number;
    rate: Rate | undefined;
  };

  const fee = (b: Booking) => {
    const r = rateByCategory.get(b.category);
    const price = Number(b.price ?? 0);
    if (!r) return 0;
    const raw = (price * Number(r.percent)) / 100 + Number(r.min_fee);
    return Math.min(raw, price);
  };

  const rows = bookings ?? [];
  const totals = rows.reduce(
    (acc, b) => {
      const price = Number(b.price ?? 0);
      const f = fee(b);
      acc.gross += price;
      acc.commission += f;
      acc.net += price - f;
      acc.count += 1;
      if (b.payment_status === "paid") acc.paid += price;
      else acc.unpaid += price;
      return acc;
    },
    { gross: 0, commission: 0, net: 0, count: 0, paid: 0, unpaid: 0 },
  );

  const byCategory = useMemo(() => {
    const m = new Map<string, CatCalc>();
    for (const b of rows) {
      const k = b.category;
      const r = rateByCategory.get(k);
      const cur =
        m.get(k) ??
        ({
          count: 0,
          gross: 0,
          percentFee: 0,
          minFeeTotal: 0,
          rawCommission: 0,
          capAdjustment: 0,
          commission: 0,
          net: 0,
          rate: r,
        } as CatCalc);
      const price = Number(b.price ?? 0);
      const pct = r ? (price * Number(r.percent)) / 100 : 0;
      const mf = r ? Number(r.min_fee) : 0;
      const raw = pct + mf;
      const applied = Math.min(raw, price);
      cur.count += 1;
      cur.gross += price;
      cur.percentFee += pct;
      cur.minFeeTotal += mf;
      cur.rawCommission += raw;
      cur.capAdjustment += raw - applied;
      cur.commission += applied;
      cur.net += price - applied;
      m.set(k, cur);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].gross - a[1].gross);
  }, [rows, rateByCategory]);

  const calcTotals = byCategory.reduce(
    (a, [, v]) => {
      a.gross += v.gross;
      a.percentFee += v.percentFee;
      a.minFeeTotal += v.minFeeTotal;
      a.capAdjustment += v.capAdjustment;
      a.commission += v.commission;
      return a;
    },
    { gross: 0, percentFee: 0, minFeeTotal: 0, capAdjustment: 0, commission: 0 },
  );
  const adjustments = 0;
  const netPayout = calcTotals.gross - calcTotals.commission - adjustments;

  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setFrom(isoDate(start));
    setTo(isoDate(end));
  };

  if (rolesLoading)
    return (
      <SiteShell>
        <div className="p-10 text-sm text-muted-foreground">Loading…</div>
      </SiteShell>
    );
  if (!isAdmin) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Admins only</h1>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link
          to="/admin/reconciliation"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> Back to reconciliation
        </Link>

        <div className="mt-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-wider text-primary">
            <Users className="size-3" /> Provider payout
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold">
            {provider?.business_name ?? "Provider"}
          </h1>
          {provider && (
            <p className="mt-1 text-xs text-muted-foreground capitalize">
              {provider.category} · {provider.city} · ★ {Number(provider.rating_avg).toFixed(2)} ·{" "}
              {provider.jobs_completed} jobs
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
          <Field label="From">
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="To">
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setPreset(d)}
                className="rounded-full border border-border px-3 py-1.5 text-[11px] hover:bg-muted"
              >
                Last {d}d
              </button>
            ))}
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {rows.length} completed bookings
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Gross" value={`$${totals.gross.toFixed(2)}`} sub={`${totals.count} bookings`} />
          <Kpi
            label="Commission"
            value={`$${totals.commission.toFixed(2)}`}
            sub={
              totals.gross > 0
                ? `${((totals.commission / totals.gross) * 100).toFixed(1)}% effective`
                : "—"
            }
          />
          <Kpi label="Net payout" value={`$${totals.net.toFixed(2)}`} sub="Owed to provider" />
          <Kpi
            label="Paid / unpaid"
            value={`$${totals.paid.toFixed(0)} / $${totals.unpaid.toFixed(0)}`}
            sub="Gross by status"
          />
        </div>

        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading bookings…</p>}

        {(() => {
          const storedNet = rows.reduce((s, b) => {
            const r = rateByCategory.get(b.category);
            const p = Number(b.price ?? 0);
            if (!r) return s + p;
            return s + (p - ((p * Number(r.percent)) / 100 + Number(r.min_fee)));
          }, 0);
          const issues: DiscrepancyIssue[] = [];
          const missingCats = Array.from(
            new Set(rows.filter((b) => !rateByCategory.get(b.category)).map((b) => b.category)),
          );
          if (missingCats.length > 0)
            issues.push({
              kind: "missing_rate",
              label: `No active rate for: ${missingCats.join(", ")}`,
              detail: `${rows.filter((b) => !rateByCategory.get(b.category)).length} booking(s)`,
            });
          if (calcTotals.capAdjustment > 0)
            issues.push({
              kind: "min_fee_cap",
              label: "Min-fee cap reduced commission on one or more bookings.",
              amount: calcTotals.capAdjustment,
            });
          const unpaidCount = rows.filter((b) => b.payment_status !== "paid").length;
          if (unpaidCount > 0)
            issues.push({
              kind: "unpaid",
              label: `${unpaidCount} of ${rows.length} bookings have unpaid payment status.`,
              amount: totals.unpaid,
            });
          const zeroCount = rows.filter((b) => !b.price || Number(b.price) <= 0).length;
          if (zeroCount > 0)
            issues.push({
              kind: "zero_price",
              label: `${zeroCount} booking(s) recorded with no price.`,
            });
          if (Math.abs(netPayout - storedNet) > 0.01)
            issues.push({
              kind: "net_mismatch",
              label: "Reconciled net diverges from provider's stored payout snapshot.",
              amount: netPayout - storedNet,
            });
          return (
            <DiscrepancyBanner
              className="mt-6"
              computedNet={netPayout}
              storedNet={storedNet}
              issues={issues}
            />
          );
        })()}


        <Panel title="Net payout calculation" className="mt-6" empty={byCategory.length === 0}>
          <div className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <Calc label="Gross (sum of completed bookings)" value={`$${calcTotals.gross.toFixed(2)}`} bold />
              <Calc label="Total commission applied" value={`− $${calcTotals.commission.toFixed(2)}`} bold />
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Commission components
              </div>
              <div className="mt-2 space-y-1.5">
                <Calc label="Percent fees across categories" value={`$${calcTotals.percentFee.toFixed(2)}`} />
                <Calc label="Flat min-fees · sum across bookings" value={`+ $${calcTotals.minFeeTotal.toFixed(2)}`} />
                {calcTotals.capAdjustment > 0 && (
                  <Calc
                    label="Min-fee cap · reductions where raw fee exceeded gross"
                    value={`− $${calcTotals.capAdjustment.toFixed(2)}`}
                  />
                )}
                <Calc label="Adjustments (refunds, manual credits)" value={`− $${adjustments.toFixed(2)}`} />
              </div>
            </div>
            <div className="border-t border-border/60 pt-2">
              <Calc
                label="Net payout · gross − commission − adjustments"
                value={`$${netPayout.toFixed(2)}`}
                bold
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {calcTotals.capAdjustment > 0
                ? "Min-fee cap applied on bookings where percent + min fee exceeded the gross price."
                : "No min-fee cap triggered in this range."}
              {" · "}
              {adjustments === 0 ? "No adjustments recorded for this range." : ""}
            </p>
          </div>
        </Panel>

        <Panel title="By service category" className="mt-4" empty={byCategory.length === 0}>
          <Table
            headers={["Category", "Rate", "#", "Gross", "% fee", "Min fees", "Cap", "Commission", "Net"]}
            rows={byCategory.map(([cat, v]) => {
              const r = v.rate;
              return [
                <span key="c" className="capitalize">
                  {cat}
                </span>,
                r ? (
                  <span key="r" className="text-[11px] text-muted-foreground">
                    {Number(r.percent).toFixed(1)}% + ${Number(r.min_fee).toFixed(2)}
                  </span>
                ) : (
                  <span key="r" className="text-[11px] text-amber-500">
                    no rate
                  </span>
                ),
                v.count,
                `$${v.gross.toFixed(2)}`,
                `$${v.percentFee.toFixed(2)}`,
                `$${v.minFeeTotal.toFixed(2)}`,
                v.capAdjustment > 0 ? `− $${v.capAdjustment.toFixed(2)}` : "—",
                `$${v.commission.toFixed(2)}`,
                `$${v.net.toFixed(2)}`,
              ];
            })}
          />
        </Panel>


        <Panel title="Booking-level breakdown" className="mt-4" empty={rows.length === 0}>
          <Table
            headers={["Completed", "Category", "Payment", "Gross", "Commission", "Net", ""]}
            rows={rows.map((b) => {
              const price = Number(b.price ?? 0);
              const f = fee(b);
              return [
                new Date(b.updated_at).toLocaleDateString(),
                <span key="c" className="capitalize">
                  {b.category}
                </span>,
                <span
                  key="p"
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                    b.payment_status === "paid"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {b.payment_status ?? "—"}
                </span>,
                `$${price.toFixed(2)}`,
                `$${f.toFixed(2)}`,
                `$${(price - f).toFixed(2)}`,
                <Link
                  key="l"
                  to="/admin/reconciliation/booking/$bookingId"
                  params={{ bookingId: b.id }}
                  className="text-[11px] text-primary hover:underline"
                >
                  Details →
                </Link>,
              ];
            })}
          />
        </Panel>
      </section>
    </SiteShell>
  );
}

function Calc({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between ${bold ? "font-semibold" : "text-muted-foreground"}`}
    >
      <span>{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && (
        <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/80">
          {sub}
        </div>
      )}
    </div>
  );
}
function Panel({
  title,
  children,
  className = "",
  empty,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  empty?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3">
        {empty ? <p className="text-xs text-muted-foreground">No data in this range.</p> : children}
      </div>
    </div>
  );
}
function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead className="text-muted-foreground">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={`py-1.5 pr-3 ${i >= 2 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border/60">
              {r.map((cell, j) => (
                <td
                  key={j}
                  className={`py-1.5 pr-3 ${j >= 2 && j < headers.length - 1 ? "text-right tabular-nums" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminProviderBreakdownRoute() {
  return (
    <RoleGate role="admin">
      <ProviderBreakdown />
    </RoleGate>
  );
}
