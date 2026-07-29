import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { RoleSwitcher } from "./role-switcher";
import { ROLES, type AppRole } from "@/lib/roles";

export type PortalNavItem<K extends string> = { key: K; label: string; icon: any };

/**
 * Shared shell for every role portal: brand + role switcher, desktop sidebar,
 * mobile bottom tabs.
 */
export function PortalShell<K extends string>({
  role,
  nav,
  current,
  onChange,
  mobileKeys,
  children,
}: {
  role: AppRole;
  nav: PortalNavItem<K>[];
  current: K;
  onChange: (k: K) => void;
  mobileKeys?: K[];
  children: ReactNode;
}) {
  const meta = ROLES[role];
  const tabs = mobileKeys ? nav.filter((n) => mobileKeys.includes(n.key)) : nav.slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground">
              Z
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-bold leading-tight">Zwits</span>
              <span className="block truncate text-[11px] text-muted-foreground">{meta.portal}</span>
            </span>
          </Link>
          <RoleSwitcher />
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 pb-28 pt-6 sm:px-6 lg:pb-10">
        <aside className="hidden w-60 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1">
            {nav.map((n) => (
              <button
                key={n.key}
                onClick={() => onChange(n.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  current === n.key
                    ? "bg-primary/12 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <n.icon className="size-4 shrink-0" />
                <span className="truncate">{n.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {tabs.map((n) => (
            <button
              key={n.key}
              onClick={() => onChange(n.key)}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] transition",
                current === n.key ? "text-primary" : "text-muted-foreground",
              )}
            >
              <n.icon className="size-5" />
              <span className="truncate px-1">{n.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
