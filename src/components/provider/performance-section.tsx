import { Award, Repeat, Timer, TrendingUp } from "lucide-react";
import { Panel, StatCard, MetricBar } from "./dashboard-kit";
import type { ProviderData } from "./use-provider-data";

export function PerformanceSection({ data }: { data: ProviderData }) {
  const { performance, provider, completed } = data;
  const jobsDone = provider?.jobs_completed ?? completed.length;

  const badges = [
    { label: "Verified pro", earned: provider?.verification_status === "approved" },
    { label: "First job", earned: jobsDone >= 1 },
    { label: "10 jobs", earned: jobsDone >= 10 },
    { label: "50 jobs", earned: jobsDone >= 50 },
    { label: "Top rated (4.8+)", earned: Number(provider?.rating_avg ?? 0) >= 4.8 },
    { label: "Fast responder", earned: (performance.avgResponseSeconds ?? 999) < 15 },
    { label: "Loyal following", earned: performance.repeatCustomers >= 3 },
  ];

  const tier =
    jobsDone >= 50 && Number(provider?.rating_avg ?? 0) >= 4.7
      ? "Gold"
      : jobsDone >= 10
        ? "Silver"
        : "Bronze";

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Offers received" value={performance.offersReceived} icon={TrendingUp} />
        <StatCard
          label="Avg response"
          value={performance.avgResponseSeconds != null ? `${performance.avgResponseSeconds.toFixed(0)}s` : "—"}
          icon={Timer}
          accent="primary"
        />
        <StatCard label="Repeat customers" value={performance.repeatCustomers} icon={Repeat} />
        <StatCard label="Leaderboard tier" value={tier} icon={Award} accent="gold" />
      </div>

      <Panel title="Quality metrics" description="Based on your offer and booking history.">
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricBar label="Acceptance rate" value={performance.acceptanceRate} />
          <MetricBar label="Response rate" value={performance.responseRate} />
          <MetricBar label="Completion rate" value={performance.completionRate} />
          <MetricBar label="Cancellation rate" value={performance.cancellationRate} />
        </div>
      </Panel>

      <Panel title="Achievements">
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <span
              key={b.label}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                b.earned ? "bg-gradient-to-r from-primary/25 to-gold/25 text-foreground" : "bg-muted text-muted-foreground/60"
              }`}
            >
              {b.earned ? "🏅 " : "🔒 "}
              {b.label}
            </span>
          ))}
        </div>
      </Panel>
    </div>
  );
}
