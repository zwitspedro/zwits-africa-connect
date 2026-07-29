import { useMemo, useState } from "react";
import { Star, Trophy, Target, Lock, Medal, Crown, Plus, Check } from "lucide-react";
import { Panel, StatCard, EmptyState, MetricBar } from "../dashboard-kit";
import { ProgressRow } from "./score-ring";
import type { ProviderData } from "../use-provider-data";
import type { GrowthData } from "./use-growth";

export function GrowthReputation({ growth }: { growth: GrowthData }) {
  const { reputation } = growth;
  const dist = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    count: reputation.reviews.filter((r: any) => r.rating === s).length,
  }));
  const total = reputation.reviews.length || 1;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Average rating" value={reputation.avgRating.toFixed(1)} icon={Star} accent="gold" />
        <StatCard label="Satisfaction" value={`${reputation.satisfaction}%`} accent="positive" sub="4★ and above" />
        <StatCard label="Total reviews" value={reputation.reviews.length} />
        <StatCard label="Reliability" value={`${reputation.scores.reliability}%`} accent="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Rating breakdown">
          <div className="grid gap-2.5">
            {dist.map((d) => (
              <ProgressRow key={d.star} label={`${d.star} star`} value={(d.count / total) * 100} />
            ))}
          </div>
        </Panel>

        <Panel title="Service scores">
          <div className="grid gap-4">
            <MetricBar label="Reliability" value={reputation.scores.reliability} />
            <MetricBar label="Professionalism" value={reputation.scores.professionalism} />
            <MetricBar label="Punctuality" value={reputation.scores.punctuality} />
            <MetricBar label="Work quality" value={reputation.scores.quality} />
            <MetricBar label="Response quality" value={reputation.scores.responseQuality} />
          </div>
        </Panel>
      </div>

      <Panel title="Recent reviews" description="Reply politely and quickly — future customers read these.">
        {reputation.reviews.length === 0 ? (
          <EmptyState title="No reviews yet." hint="Complete jobs to start collecting reviews." />
        ) : (
          <ul className="grid gap-2">
            {reputation.reviews.slice(0, 6).map((r: any) => (
              <li key={r.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="flex items-center gap-1 text-gold">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={`size-3.5 ${i < r.rating ? "fill-current" : "opacity-25"}`} />
                  ))}
                  <span className="ml-2 text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.review && <p className="mt-1.5 text-sm text-muted-foreground">{r.review}</p>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

export function GrowthAchievements({ growth }: { growth: GrowthData }) {
  const earned = growth.achievements.filter((a) => a.earned);
  const rank = growth.ranking;

  return (
    <div className="grid gap-4">
      <Panel title="Achievements" description={`${earned.length} of ${growth.achievements.length} unlocked`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {growth.achievements.map((a) => (
            <div
              key={a.key}
              className={`grid place-items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                a.earned
                  ? "border-gold/40 bg-gradient-to-br from-gold/15 to-transparent"
                  : "border-border/60 bg-background/30 opacity-60"
              }`}
            >
              <div className={`grid size-11 place-items-center rounded-full ${a.earned ? "bg-gold/20 text-gold" : "bg-muted text-muted-foreground"}`}>
                {a.earned ? <Trophy className="size-5" /> : <Lock className="size-4" />}
              </div>
              <div className="text-xs font-semibold leading-tight">{a.label}</div>
              <div className="text-[10px] text-muted-foreground">{a.hint}</div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <RankCard title="Your city" icon={Crown} rank={rank.city.rank} total={rank.city.total} />
        <RankCard title="Your category" icon={Medal} rank={rank.category.rank} total={rank.category.total} />
        <RankCard title="Nationwide" icon={Trophy} rank={rank.national.rank} total={rank.national.total} />
      </div>

      <Panel title="Top providers in your city" description="Anonymised leaderboard — climb it by completing more highly rated jobs.">
        {rank.city.top.length === 0 ? (
          <EmptyState title="Leaderboard unavailable." />
        ) : (
          <ol className="grid gap-2">
            {rank.city.top.map((p: any, i: number) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-3 text-sm">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{maskName(p.business_name)}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {Number(p.rating_avg).toFixed(1)}★ · {p.jobs_completed} jobs
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}

function maskName(name: string) {
  if (!name) return "Provider";
  const parts = name.split(" ");
  return parts.map((p, i) => (i === 0 ? p : `${p[0] ?? ""}.`)).join(" ");
}

function RankCard({ title, icon: Icon, rank, total }: { title: string; icon: any; rank: number | null; total: number }) {
  const pct = rank && total ? Math.round((1 - rank / total) * 100) : 0;
  return (
    <Panel>
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="font-display text-2xl font-black">{rank ? `#${rank}` : "—"}</div>
          <div className="text-[11px] text-muted-foreground">
            of {total} providers{rank ? ` · top ${100 - pct === 100 ? 100 : Math.max(1, 100 - pct)}%` : ""}
          </div>
        </div>
      </div>
    </Panel>
  );
}

type Goal = { id: string; label: string; target: number; current: number };
const GOALS_KEY = "zwits.provider.goals";

export function GrowthGoals({ data }: { data: ProviderData }) {
  const monthJobs = useMemo(
    () =>
      data.completed.filter((j: any) => {
        const d = new Date(j.completed_at ?? j.updated_at ?? j.created_at);
        const n = new Date();
        return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
      }),
    [data.completed],
  );
  const monthRevenue = monthJobs.reduce((s: number, j: any) => s + (Number(j.price) || 0), 0);

  const [goals, setGoals] = useState<Goal[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(GOALS_KEY) ?? "[]");
    } catch {
      return [];
    }
  });
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");

  const save = (next: Goal[]) => {
    setGoals(next);
    localStorage.setItem(GOALS_KEY, JSON.stringify(next));
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Jobs this month" value={monthJobs.length} icon={Target} accent="primary" />
        <StatCard label="Revenue this month" value={`$${monthRevenue.toFixed(2)}`} accent="gold" />
        <StatCard label="New customers" value={new Set(monthJobs.map((j: any) => j.customer_id)).size} />
        <StatCard label="Active goals" value={goals.length} accent="positive" />
      </div>

      <Panel title="Business goals" description="Set monthly targets and track them as you work.">
        <form
          className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!label.trim() || !Number(target)) return;
            save([...goals, { id: crypto.randomUUID(), label: label.trim(), target: Number(target), current: 0 }]);
            setLabel("");
            setTarget("");
          }}
        >
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Complete 20 jobs"
            className="min-h-11 rounded-xl border border-border bg-background/60 px-4 text-sm outline-none focus:border-primary"
          />
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            inputMode="numeric"
            placeholder="Target"
            className="min-h-11 rounded-xl border border-border bg-background/60 px-4 text-sm outline-none focus:border-primary"
          />
          <button className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
            <Plus className="size-4" /> Add
          </button>
        </form>

        {goals.length === 0 ? (
          <EmptyState title="No goals yet." hint="Add your first monthly target above." />
        ) : (
          <ul className="grid gap-3">
            {goals.map((g) => (
              <li key={g.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-medium">{g.label}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => save(goals.map((x) => (x.id === g.id ? { ...x, current: x.current + 1 } : x)))}
                      className="grid size-8 place-items-center rounded-full border border-border hover:bg-muted"
                      aria-label="Increment progress"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button
                      onClick={() => save(goals.filter((x) => x.id !== g.id))}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressRow label={`${g.current} of ${g.target}`} value={(g.current / g.target) * 100} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
