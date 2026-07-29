import { useMemo } from "react";
import { format, startOfWeek } from "date-fns";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { EmptyState, Panel, StatCard } from "@/components/provider/dashboard-kit";
import { DRIVER_COMMISSION, driverPayout } from "@/lib/delivery-config";
import type { DeliveryRow } from "./use-driver-data";

export function DriverEarnings({ completed, metrics }: { completed: DeliveryRow[]; metrics: any }) {
  const series = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const d of completed) {
      const key = format(startOfWeek(new Date(d.delivered_at ?? d.created_at)), "d MMM");
      buckets.set(key, (buckets.get(key) ?? 0) + driverPayout(d.price));
    }
    return [...buckets.entries()].slice(-8).map(([week, amount]) => ({ week, amount: Math.round(amount * 100) / 100 }));
  }, [completed]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Today" value={`$${metrics.todayEarnings.toFixed(2)}`} accent="positive" />
        <StatCard label="All time" value={`$${metrics.totalEarnings.toFixed(2)}`} accent="gold" />
        <StatCard label="Deliveries" value={metrics.totalCount} />
        <StatCard label="Commission" value={`${Math.round(DRIVER_COMMISSION * 100)}%`} sub="Zwits platform fee" />
      </div>

      <Panel title="Weekly payouts" description="Net of the Zwits commission">
        {series.length === 0 ? (
          <EmptyState title="No earnings yet" hint="Complete your first delivery to see payouts here." />
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="driverEarn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: any) => [`$${v}`, "Payout"]}
                />
                <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="url(#driverEarn)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Panel title="Recent deliveries">
        {completed.length === 0 ? (
          <EmptyState title="Nothing completed yet" />
        ) : (
          <ul className="divide-y divide-border/60">
            {completed.slice(0, 12).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{d.dropoff_address}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(d.delivered_at ?? d.created_at), "d MMM, HH:mm")}
                    {d.distance_km != null && ` · ${d.distance_km} km`}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-400">
                  +${driverPayout(d.price).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
