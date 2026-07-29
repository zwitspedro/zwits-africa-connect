import { Star, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Panel, StatCard, EmptyState } from "./dashboard-kit";
import type { ProviderData } from "./use-provider-data";

export function ReviewsSection({ data }: { data: ProviderData }) {
  const { reviews, provider } = data;
  const distribution = [5, 4, 3, 2, 1].map((n) => ({
    stars: `${n}★`,
    count: reviews.filter((r: any) => r.rating === n).length,
  }));

  const recentAvg =
    reviews.slice(0, 10).length > 0
      ? reviews.slice(0, 10).reduce((s: number, r: any) => s + r.rating, 0) / reviews.slice(0, 10).length
      : null;

  const tips = [
    reviews.some((r: any) => r.rating <= 3)
      ? "Follow up on low-rated jobs — a quick apology message often turns a 3★ into repeat work."
      : "Keep your streak going: confirm arrival time in chat before every job.",
    "Send a photo of finished work in chat — customers rate photo-documented jobs higher.",
    "Respond to job offers within 15 seconds; fast responders get more first-wave offers.",
  ];

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Average rating" value={`${Number(provider?.rating_avg ?? 0).toFixed(1)} ★`} icon={Star} accent="gold" />
        <StatCard label="Total reviews" value={provider?.ratings_count ?? 0} />
        <StatCard label="Last 10 jobs" value={recentAvg ? `${recentAvg.toFixed(1)} ★` : "—"} accent="primary" />
        <StatCard label="5★ reviews" value={distribution[0].count} accent="positive" />
      </div>

      <Panel title="Rating distribution">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="stars" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Customer reviews">
        {reviews.length === 0 ? (
          <EmptyState title="No reviews yet." hint="Complete jobs to start collecting ratings." />
        ) : (
          <ul className="grid gap-2">
            {reviews.map((r: any) => (
              <li key={r.id} className="rounded-2xl border border-border/70 bg-background/40 p-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`size-4 ${n <= r.rating ? "fill-gold text-gold" : "text-muted-foreground/40"}`} />
                  ))}
                  <span className="ml-2 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.review && <p className="mt-1.5 text-sm text-muted-foreground">{r.review}</p>}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Improve your rating" action={<Sparkles className="size-4 text-gold" />}>
        <ul className="grid gap-2 text-sm text-muted-foreground">
          {tips.map((t) => (
            <li key={t} className="flex gap-2 rounded-xl border border-border/60 bg-background/40 p-3">
              <span className="text-gold">•</span> {t}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
