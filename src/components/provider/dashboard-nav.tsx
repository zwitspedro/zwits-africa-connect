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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type SectionKey =
  | "home"
  | "messages"
  | "completed"
  | "available"
  | "active"
  | "route"
  | "schedule"
  | "earnings"
  | "wallet"
  | "reviews"
  | "performance"
  | "growth"
  | "notifications"
  | "profile"
  | "documents"
  | "vehicle"
  | "area"
  | "payout"
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
          <Button variant="ghost"
            key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              "group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200",
              active
                ? "bg-primary/12 font-semibold text-primary-text"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            {!!count && (
              <span className="shrink-0 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{count}</span>
            )}
          </Button>
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
          const item = NAV.find((n) => n.key === key);
          if (!item) return null;
          const active = current === key;
          const count = badges[key];
          return (
            <li key={key}>
              <Button variant="ghost"
                onClick={() => onChange(key)}
                className={cn(
                  "relative flex min-h-14 w-full flex-col items-center justify-center gap-1 text-[10px] transition-colors",
                  active ? "text-primary-text" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" />
                <span className="truncate px-1">{item.label.split(" ")[0]}</span>
                {!!count && (
                  <span className="absolute right-1/4 top-2 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </Button>
            </li>
          );
        })}
        <li>
          <Button variant="ghost"
            onClick={onMore}
            className="flex min-h-14 w-full flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground"
          >
            <Settings className="size-5" />
            <span>More</span>
          </Button>
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
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="lg:hidden">
        <DialogTitle>Provider sections</DialogTitle>
        <DialogDescription className="sr-only">Choose a section of your provider account.</DialogDescription>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {NAV.filter((n) => !MOBILE_KEYS.includes(n.key)).map((item) => (
            <Button variant="outline" key={item.key} onClick={() => { onChange(item.key); onClose(); }} className="min-h-20 flex-col gap-2 p-3 text-xs">
              <item.icon aria-hidden="true" className="size-5 text-primary-text" />
              <span>{item.label}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
