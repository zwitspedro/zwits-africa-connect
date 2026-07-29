import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Clock, MapPin, TrendingUp, DollarSign, Repeat, Star } from "lucide-react";
import { Panel, StatCard, MetricBar, EmptyState } from "../dashboard-kit";
import type { ProviderData } from "../use-provider-data";
import type { GrowthData } from "./use-growth";

const axis = { fontSize: 11, fill: "var(--color-muted-foreground)" } as const;
const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
} as const;

export function GrowthAnalytics({ data, growth }: { data: ProviderData; growth: GrowthData }) {
  const { performance, provider } = data;
  const { analytics } = growth;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Avg rating" value={`${Number(provider?.rating_avg ?? 0).toFixed(1)} ★`} icon={Star} accent="gold" />
        <StatCard label="Completion" value={performance.completionRate != null ? `${performance.completionRate.toFixed(0)}%` : "—"} accent="positive" />
        <StatCard label="Avg response" value={performance.avgResponseSeconds != null ? `${performance.avgResponseSeconds.toFixed(0)}s` : "—"} icon={Clock} accent="primary" />
        <StatCard label="Repeat customers" value={performance.repeatCustomers} icon={Repeat} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Daily bookings" description="Last 14 days">
          <Chart>
            <BarChart data={analytics.bookingsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval={1} />
              <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} width={28} />
              <Tooltip cursor={{ fill: "var(--color-muted)", opacity: 0.3 }} contentStyle={tooltipStyle} />
              <Bar dataKey="bookings" fill="var(--color-primary)" radius={[5, 5, 0, 0]} />
            </BarChart>
          </Chart>
        </Panel>

        <Panel title="Weekly bookings" description="By day of week">
          <Chart>
            <BarChart data={analytics.byWeekday}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} width={28} />
              <Tooltip cursor={{ fill: "var(--color-muted)", opacity: 0.3 }} contentStyle={tooltipStyle} />
              <Bar dataKey="bookings" fill="var(--color-gold)" radius={[5, 5, 0, 0]} />
            </BarChart>
          </Chart>
        </Panel>

        <Panel title="Monthly bookings & customers" description="Last 6 months">
          <Chart>
            <LineChart data={analytics.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="bookings" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="customers" stroke="var(--color-gold)" strokeWidth={2} dot={false} />
            </LineChart>
          </Chart>
        </Panel>

        <Panel title="Income trend" description="Net payouts, last 8 weeks">
          <Chart>
            <AreaChart data={analytics.trend}>
              <defs>
                <linearGradient id="growthNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Net"]} />
              <Area type="monotone" dataKey="net" stroke="var(--color-primary)" strokeWidth={2} fill="url(#growthNet)" />
            </AreaChart>
          </Chart>
        </Panel>
      </div>

      <Panel title="Quality metrics">
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricBar label="Job completion rate" value={performance.completionRate} />
          <MetricBar label="Acceptance rate" value={performance.acceptanceRate} />
          <MetricBar label="Response rate" value={performance.responseRate} />
          <MetricBar label="Cancellation rate" value={performance.cancellationRate} />
        </div>
      </Panel>
    </div>
  );
}

export function GrowthOpportunities({ growth }: { growth: GrowthData }) {
  const { opportunities: o, analytics } = growth;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Best working hour" value={o.bestHour?.bookings ? `${o.bestHour.label}:00` : "—"} icon={Clock} accent="primary" />
        <StatCard label="Peak day" value={o.peakDay?.bookings ? o.peakDay.label : "—"} icon={TrendingUp} />
        <StatCard label="Avg job value" value={`$${o.avgJobValue.toFixed(2)}`} icon={DollarSign} accent="gold" />
        <StatCard
          label="Top earning service"
          value={o.topCategoryByRevenue ? o.topCategoryByRevenue[0] : "—"}
          sub={o.topCategoryByRevenue ? `$${o.topCategoryByRevenue[1].toFixed(2)}` : undefined}
          accent="positive"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Most requested services" description="Across your job history">
          {o.topServices.length === 0 ? (
            <EmptyState title="Not enough job data yet." />
          ) : (
            <ul className="grid gap-2">
              {o.topServices.map(([name, count]) => (
                <li key={name} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/40 p-3 text-sm">
                  <span className="truncate capitalize">{name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{count} job(s)</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="High-demand suburbs" description="Where your jobs come from">
          {o.suburbs.length === 0 ? (
            <EmptyState title="No location data yet." />
          ) : (
            <ul className="grid gap-2">
              {o.suburbs.map(([name, count]) => (
                <li key={name} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-3 text-sm">
                  <MapPin className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Booking demand by hour" description="Line up your working hours with demand.">
        <Chart height={180}>
          <BarChart data={analytics.byHour}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval={2} />
            <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} width={28} />
            <Tooltip cursor={{ fill: "var(--color-muted)", opacity: 0.3 }} contentStyle={tooltipStyle} />
            <Bar dataKey="bookings" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </Chart>
      </Panel>

      <Panel title="Suggested improvements">
        <ul className="grid gap-2 text-sm text-muted-foreground">
          <li className="rounded-xl border border-border/60 bg-background/40 p-3">
            Your average job value is <strong className="text-foreground">${o.avgJobValue.toFixed(2)}</strong>. Providers with
            your rating typically charge around <strong className="text-foreground">${(o.avgJobValue * 1.1).toFixed(2)}</strong>.
          </li>
          <li className="rounded-xl border border-border/60 bg-background/40 p-3">
            You've completed {Math.round(growth.opportunities.peerAvgJobs)} jobs fewer/more than the average verified provider —
            staying online during {o.peakDay?.label ?? "peak days"} closes the gap fastest.
          </li>
          <li className="rounded-xl border border-border/60 bg-background/40 p-3">
            Add weekend availability: customers browse for providers most outside working hours.
          </li>
        </ul>
      </Panel>
    </div>
  );
}

function Chart({ children, height = 200 }: { children: any; height?: number }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
