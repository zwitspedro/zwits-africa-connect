import { useMemo } from "react";
import { Download, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Panel, StatCard, EmptyState } from "./dashboard-kit";
import type { ProviderData } from "./use-provider-data";

export function EarningsSection({ data }: { data: ProviderData }) {
  const { earnings, completed, netFor, feeFor, rateByCategory } = data;

  const rows = useMemo(
    () =>
      completed.map((j: any) => ({
        date: new Date(j.completed_at ?? j.updated_at).toLocaleDateString(),
        category: j.category,
        address: j.address,
        gross: Number(j.price) || 0,
        fee: feeFor(j.category, Number(j.price) || 0),
        net: netFor(j),
        released: !!j.customer_confirmed_at,
      })),
    [completed, feeFor, netFor],
  );

  const downloadCsv = () => {
    const header = ["Date", "Category", "Address", "Gross", "Commission", "Net", "Status"];
    const body = rows.map((r) => [
      r.date,
      r.category,
      `"${r.address.replace(/"/g, '""')}"`,
      r.gross.toFixed(2),
      r.fee.toFixed(2),
      r.net.toFixed(2),
      r.released ? "Released" : "Pending",
    ]);
    const csv = [header, ...body].map((l) => l.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `zwits-earnings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Today" value={`$${earnings.today.toFixed(2)}`} accent="primary" />
        <StatCard label="This week" value={`$${earnings.week.toFixed(2)}`} />
        <StatCard label="This month" value={`$${earnings.month.toFixed(2)}`} />
        <StatCard label="All time net" value={`$${earnings.net.toFixed(2)}`} sub={`Fees $${earnings.fees.toFixed(2)}`} accent="gold" />
      </div>

      <Panel
        title="Income trend"
        description="Net payouts over the last 8 weeks"
        action={<TrendingUp className="size-4 text-primary" />}
      >
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={earnings.trend} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Net"]}
              />
              <Area type="monotone" dataKey="net" stroke="var(--color-primary)" strokeWidth={2} fill="url(#netFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel
        title="Payout history"
        description="Net payout = job price − platform commission"
        action={
          <button
            onClick={downloadCsv}
            disabled={!rows.length}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-4 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            <Download className="size-3.5" /> Report
          </button>
        }
      >
        {rows.length === 0 ? (
          <EmptyState title="No completed jobs yet." hint="Earnings appear here once a job is finished." />
        ) : (
          <ul className="grid gap-2">
            {rows.slice(0, 30).map((r, i) => {
              const rate: any = rateByCategory.get(r.category);
              return (
                <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium capitalize">{r.category} — {r.address}</div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {r.date} · ${r.gross.toFixed(2)} gross
                      {rate ? ` · ${Number(rate.percent).toFixed(1)}% + $${Number(rate.min_fee).toFixed(2)}` : " · no rate set"}
                      {r.released ? " · released" : " · pending confirmation"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-muted-foreground">−${r.fee.toFixed(2)}</div>
                    <div className="font-semibold tabular-nums">${r.net.toFixed(2)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
