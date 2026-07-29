import { useState } from "react";
import { Sparkles, BarChart3, Compass, Star, Trophy, Target, Megaphone } from "lucide-react";
import { useGrowth } from "./use-growth";
import { GrowthOverview } from "./growth-overview";
import { GrowthAnalytics, GrowthOpportunities } from "./growth-analytics";
import { GrowthReputation, GrowthAchievements, GrowthGoals } from "./growth-reputation";
import { MarketingToolkit, LearningAcademy } from "./marketing-toolkit";
import type { ProviderData } from "../use-provider-data";

const TABS = [
  { key: "coach", label: "Coach", icon: Sparkles },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "opportunities", label: "Opportunities", icon: Compass },
  { key: "reputation", label: "Reputation", icon: Star },
  { key: "achievements", label: "Rank & badges", icon: Trophy },
  { key: "goals", label: "Goals", icon: Target },
  { key: "marketing", label: "Marketing", icon: Megaphone },
] as const;

export function GrowthSection({ data }: { data: ProviderData }) {
  const growth = useGrowth(data);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("coach");

  return (
    <div className="grid gap-4">
      <header>
        <h1 className="font-display text-3xl font-black tracking-tight">Growth Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your business coach, analytics and marketing tools in one place.
        </p>
      </header>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex w-max gap-1.5 rounded-full border border-border/70 bg-card/60 p-1.5 backdrop-blur">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-xs font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <t.icon className="size-3.5" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "coach" && <GrowthOverview data={data} growth={growth} />}
      {tab === "analytics" && <GrowthAnalytics data={data} growth={growth} />}
      {tab === "opportunities" && <GrowthOpportunities growth={growth} />}
      {tab === "reputation" && <GrowthReputation growth={growth} />}
      {tab === "achievements" && <GrowthAchievements growth={growth} />}
      {tab === "goals" && (
        <div className="grid gap-4">
          <GrowthGoals data={data} />
          <LearningAcademy />
        </div>
      )}
      {tab === "marketing" && <MarketingToolkit data={data} />}
    </div>
  );
}
