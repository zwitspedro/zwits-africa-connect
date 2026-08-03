import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Sparkles, Zap, CheckCircle2, Circle, RefreshCw, Flame } from "lucide-react";
import { Panel, StatCard } from "../dashboard-kit";
import { ScoreRing, ProgressRow } from "./score-ring";
import { getCoachAdvice, type CoachTip } from "@/lib/growth.functions";
import type { ProviderData } from "../use-provider-data";
import type { GrowthData } from "./use-growth";

export function GrowthOverview({ data, growth }: { data: ProviderData; growth: GrowthData }) {
  const { provider, profile } = data;
  const firstName = (profile?.display_name ?? provider?.business_name ?? "there").split(" ")[0];

  return (
    <div className="grid gap-4">
      <Panel className="overflow-hidden bg-gradient-to-br from-primary/10 via-card/60 to-gold/10">
        <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
          <ScoreRing score={growth.growthScore} />
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-black leading-tight">
              Welcome back, {firstName}.
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Here's how you can grow your business today.</p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {growth.components.map((c) => (
                <ProgressRow key={c.key} label={c.key} value={c.value * 100} />
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Level" value={growth.level} icon={Flame} accent="gold" sub={`${growth.xpEarned} XP earned`} />
        <StatCard label="Profile" value={`${growth.profileCompletion}%`} accent="primary" sub="complete" />
        <StatCard label="City rank" value={growth.ranking.city.rank ? `#${growth.ranking.city.rank}` : "—"} sub={`of ${growth.ranking.city.total} in ${provider?.city}`} />
        <StatCard label="Badges" value={`${growth.achievements.filter((a) => a.earned).length}/${growth.achievements.length}`} accent="positive" />
      </div>

      <CoachPanel data={data} growth={growth} />
      <ChecklistPanel growth={growth} />
    </div>
  );
}

function CoachPanel({ data, growth }: { data: ProviderData; growth: GrowthData }) {
  const { provider, performance, earnings } = data;
  const coach = useServerFn(getCoachAdvice);

  const payload = useMemo(
    () => ({
      businessName: provider?.business_name ?? "",
      category: provider?.category ?? "",
      city: provider?.city ?? "",
      growthScore: growth.growthScore,
      rating: Number(provider?.rating_avg ?? 0),
      ratingsCount: provider?.ratings_count ?? 0,
      jobsCompleted: provider?.jobs_completed ?? 0,
      acceptanceRate: performance.acceptanceRate,
      responseSeconds: performance.avgResponseSeconds,
      completionRate: performance.completionRate,
      cancellationRate: performance.cancellationRate,
      repeatCustomers: performance.repeatCustomers,
      verified: provider?.verification_status === "approved",
      profileCompletion: growth.profileCompletion,
      weekEarnings: Number(earnings.week.toFixed(2)),
      monthEarnings: Number(earnings.month.toFixed(2)),
      peerResponsePercentile: growth.peerResponsePercentile,
      openTasks: growth.tasks.filter((t) => !t.done).map((t) => t.label).slice(0, 12),
    }),
    [provider, performance, earnings, growth],
  );

  const { data: advice, isFetching, refetch } = useQuery({
    queryKey: ["growth-coach", provider?.id, growth.growthScore, growth.profileCompletion],
    enabled: !!provider?.id,
    staleTime: 10 * 60_000,
    queryFn: () => coach({ data: payload }) as Promise<{ tips: CoachTip[]; source: string }>,
  });

  const tone: Record<string, string> = {
    high: "bg-primary/15 text-primary",
    medium: "bg-gold/20 text-gold",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <Panel
      title="AI business coach"
      description="Personalised advice based on your live performance."
      action={
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-4 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      }
    >
      {isFetching && !advice ? (
        <div className="grid gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      ) : (
        <ul className="grid gap-2">
          {(advice?.tips ?? []).map((t, i) => (
            <li key={i} className="rounded-2xl border border-border/70 bg-background/40 p-4 transition-colors hover:border-primary/40">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="font-medium">{t.title}</div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t.detail}</p>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    <Zap className="size-3" /> {t.action}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${tone[t.impact] ?? tone.low}`}>
                  {t.impact}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ChecklistPanel({ growth }: { growth: GrowthData }) {
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const pct = Math.round((growth.xpEarned / growth.xpTotal) * 100);

  return (
    <Panel
      title="Daily success checklist"
      description={`${growth.xpEarned} / ${growth.xpTotal} XP · Level ${growth.level}`}
      action={<span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-gold">{pct}%</span>}
    >
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <ul className="grid gap-2">
        {growth.tasks.map((t) => (
          <li
            key={t.key}
            onMouseEnter={() => setCelebrate(t.done ? t.key : null)}
            onMouseLeave={() => setCelebrate(null)}
            className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 transition-all ${
              t.done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/70 bg-background/40"
            }`}
          >
            {t.done ? (
              <CheckCircle2 className={`size-5 shrink-0 text-emerald-400 ${celebrate === t.key ? "scale-110" : ""} transition-transform`} />
            ) : (
              <Circle className="size-5 shrink-0 text-muted-foreground/50" />
            )}
            <div className="min-w-0">
              <div className={`truncate text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.label}</div>
              {t.hint && <div className="text-[11px] text-muted-foreground/80">{t.hint}</div>}
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${t.done ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
              +{t.xp} XP
            </span>
          </li>
        ))}
      </ul>
      <Link to="/provider/setup" className="mt-4 inline-flex min-h-10 items-center rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground">
        Finish verification
      </Link>
    </Panel>
  );
}
