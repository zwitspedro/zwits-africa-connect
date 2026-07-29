import {
  LayoutDashboard,
  Briefcase,
  Hammer,
  CalendarDays,
  DollarSign,
  Wallet,
  Star,
  BarChart3,
  Rocket,
  Bell,
  User,
  FileText,
  LifeBuoy,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionKey =
  | "home"
  | "available"
  | "active"
  | "schedule"
  | "earnings"
  | "wallet"
  | "reviews"
  | "performance"
  | "growth"
  | "notifications"
  | "profile"
  | "documents"
  | "support"
  | "settings";

export const NAV: { key: SectionKey; label: string; icon: any }[] = [
  { key: "home", label: "Home", icon: LayoutDashboard },
  { key: "available", label: "Available jobs", icon: Briefcase },
  { key: "active", label: "Active jobs", icon: Hammer },
  { key: "schedule", label: "Schedule", icon: CalendarDays },
  { key: "earnings", label: "Earnings", icon: DollarSign },
  { key: "wallet", label: "Wallet", icon: Wallet },
  { key: "reviews", label: "Reviews", icon: Star },
  { key: "performance", label: "Performance", icon: BarChart3 },
  { key: "growth", label: "Growth Center", icon: Rocket },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "profile", label: "Profile", icon: User },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "support", label: "Support", icon: LifeBuoy },
  { key: "settings", label: "Settings", icon: Settings },
];

const MOBILE_KEYS: SectionKey[] = ["home", "available", "active", "earnings"];

export function DesktopNav({
  current,
  onChange,
  badges,
}: {
  current: SectionKey;
  onChange: (k: SectionKey) => void;
  badges: Partial<Record<SectionKey, number>>;
}) {
  return (
    <nav className="sticky top-24 hidden h-fit w-56 shrink-0 flex-col gap-0.5 lg:flex">
      {NAV.map((item) => {
        const active = current === item.key;
        const count = badges[item.key];
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              "group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200",
              active
                ? "bg-primary/12 font-semibold text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            {!!count && (
              <span className="shrink-0 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{count}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export function MobileTabs({
  current,
  onChange,
  badges,
  onMore,
}: {
  current: SectionKey;
  onChange: (k: SectionKey) => void;
  badges: Partial<Record<SectionKey, number>>;
  onMore: () => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <ul className="grid grid-cols-5">
        {MOBILE_KEYS.map((key) => {
          const item = NAV.find((n) => n.key === key)!;
          const active = current === key;
          const count = badges[key];
          return (
            <li key={key}>
              <button
                onClick={() => onChange(key)}
                className={cn(
                  "relative flex min-h-14 w-full flex-col items-center justify-center gap-1 text-[10px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" />
                <span className="truncate px-1">{item.label.split(" ")[0]}</span>
                {!!count && (
                  <span className="absolute right-1/4 top-2 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        <li>
          <button
            onClick={onMore}
            className="flex min-h-14 w-full flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground"
          >
            <Settings className="size-5" />
            <span>More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

export function MoreSheet({
  open,
  onClose,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  onChange: (k: SectionKey) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
        <div className="grid grid-cols-3 gap-2">
          {NAV.filter((n) => !MOBILE_KEYS.includes(n.key)).map((item) => (
            <button
              key={item.key}
              onClick={() => {
                onChange(item.key);
                onClose();
              }}
              className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-background/50 p-3 text-[11px] transition-colors hover:border-primary/40"
            >
              <item.icon className="size-5 text-primary" />
              <span className="text-center leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
