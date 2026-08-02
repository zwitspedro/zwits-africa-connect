import {
  Home,
  Briefcase,
  Wallet,
  MessageCircle,
  User,
  Hammer,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  BarChart3,
  Star,
  Rocket,
  Bell,
  FileText,
  LifeBuoy,
  Settings,
  Navigation,
  MapPinned,
  Banknote,
  Car,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionKey } from "./dashboard-nav";

export type TabKey = "home" | "jobs" | "route" | "earnings" | "profile";

export type TabDef = {
  key: TabKey;
  label: string;
  icon: any;
  sections: { key: SectionKey; label: string; icon: any }[];
};

export const TABS: TabDef[] = [
  {
    key: "home",
    label: "Home",
    icon: Home,
    sections: [
      { key: "home", label: "Overview", icon: Home },
      { key: "performance", label: "Performance", icon: BarChart3 },
      { key: "growth", label: "Growth", icon: Rocket },
    ],
  },
  {
    key: "jobs",
    label: "Jobs",
    icon: Briefcase,
    sections: [
      { key: "available", label: "New requests", icon: Briefcase },
      { key: "active", label: "Active", icon: Hammer },
      { key: "schedule", label: "Upcoming", icon: CalendarDays },
      { key: "completed", label: "Completed", icon: CheckCircle2 },
    ],
  },
  {
    key: "route",
    label: "Route",
    icon: Navigation,
    sections: [{ key: "route", label: "Current route", icon: Navigation }],
  },
  {
    key: "earnings",
    label: "Earnings",
    icon: DollarSign,
    sections: [
      { key: "earnings", label: "Earnings", icon: DollarSign },
      { key: "wallet", label: "Wallet", icon: Wallet },
      { key: "payout", label: "Payout details", icon: Banknote },
    ],
  },
  {
    key: "profile",
    label: "Profile",
    icon: User,
    sections: [
      { key: "profile", label: "Details", icon: User },
      { key: "documents", label: "Documents", icon: FileText },
      { key: "vehicle", label: "Vehicle", icon: Car },
      { key: "area", label: "Service area", icon: MapPinned },
      { key: "reviews", label: "Ratings", icon: Star },
      { key: "messages", label: "Messages", icon: MessageCircle },
      { key: "notifications", label: "Alerts", icon: Bell },
      { key: "support", label: "Support", icon: LifeBuoy },
      { key: "settings", label: "Settings", icon: Settings },
    ],
  },
];

export const tabForSection = (s: SectionKey): TabKey =>
  TABS.find((t) => t.sections.some((x) => x.key === s))?.key ?? "home";

export function BottomTabs({
  current,
  onChange,
  badges,
}: {
  current: TabKey;
  onChange: (t: TabKey) => void;
  badges: Partial<Record<TabKey, number>>;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const active = current === tab.key;
          const count = badges[tab.key];
          return (
            <li key={tab.key}>
              <button
                onClick={() => onChange(tab.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-2xl transition-all duration-300",
                    active ? "bg-primary/12 scale-105" : "bg-transparent",
                  )}
                >
                  <tab.icon className="size-[22px]" />
                </span>
                <span>{tab.label}</span>
                {!!count && (
                  <span className="absolute right-[22%] top-1.5 grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-bold text-gold-foreground">
                    {count}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideTabs({
  currentTab,
  currentSection,
  onSelect,
  badges,
}: {
  currentTab: TabKey;
  currentSection: SectionKey;
  onSelect: (t: TabKey, s: SectionKey) => void;
  badges: Partial<Record<SectionKey, number>>;
}) {
  return (
    <nav className="sticky top-24 hidden h-fit w-60 shrink-0 flex-col gap-4 lg:flex">
      {TABS.map((tab) => (
        <div key={tab.key}>
          <div className="flex items-center gap-2 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tab.icon className="size-3.5" /> {tab.label}
          </div>
          <div className="flex flex-col gap-0.5">
            {tab.sections.map((s) => {
              const active = currentSection === s.key && currentTab === tab.key;
              const count = badges[s.key];
              return (
                <button
                  key={s.key}
                  onClick={() => onSelect(tab.key, s.key)}
                  className={cn(
                    "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all",
                    active
                      ? "bg-primary/12 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <s.icon className="size-4 shrink-0" />
                  <span className="truncate">{s.label}</span>
                  {!!count && (
                    <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function SubTabs({
  tab,
  current,
  onChange,
  badges,
}: {
  tab: TabDef;
  current: SectionKey;
  onChange: (s: SectionKey) => void;
  badges: Partial<Record<SectionKey, number>>;
}) {
  if (tab.sections.length < 2) return null;
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 lg:hidden [scrollbar-width:none]">
      <div className="flex w-max gap-2">
        {tab.sections.map((s) => {
          const active = current === s.key;
          const count = badges[s.key];
          return (
            <button
              key={s.key}
              onClick={() => onChange(s.key)}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border/70 bg-card/60 text-muted-foreground",
              )}
            >
              {s.label}
              {!!count && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-bold",
                    active ? "bg-primary-foreground/20" : "bg-primary/12 text-primary",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
