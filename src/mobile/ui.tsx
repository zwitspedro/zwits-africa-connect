/**
 * Mobile UI kit — the Material 3 flavoured primitives every Zwits Android app
 * screen is built from. Purely presentational: no data access, no business
 * logic, so the three apps stay consistent without duplicating anything.
 */
import { type ReactNode, useCallback, useRef, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Loader2, type LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ layout */

export function AppBar({
  title,
  subtitle,
  back,
  right,
  large,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: boolean;
  right?: ReactNode;
  large?: boolean;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="flex min-h-14 items-center gap-2 px-3">
        {back && (
          <button
            aria-label="Go back"
            onClick={() => router.history.back()}
            className="grid size-11 shrink-0 place-items-center rounded-full text-foreground active:bg-muted"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className={`truncate font-display font-semibold ${large ? "text-xl" : "text-base"}`}>
            {title}
          </h1>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}

/** Page body with bottom padding that clears the tab bar + gesture inset. */
export function Screen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={`min-h-[100dvh] bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))] ${className}`}
    >
      {children}
    </main>
  );
}

export function Section({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`px-4 pt-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-sm font-semibold tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const base =
    "rounded-3xl border border-border/70 bg-card p-4 text-card-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]";
  if (!onClick) return <div className={`${base} ${className}`}>{children}</div>;
  return (
    <button
      onClick={onClick}
      className={`${base} w-full text-left transition active:scale-[0.985] ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------- tab bar / fab */

export type TabItem = { to: string; label: string; icon: LucideIcon; badge?: number };

export function TabBar({ items }: { items: TabItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="mx-auto flex max-w-lg items-stretch">
        {items.map((t) => (
          <li key={t.to} className="flex-1">
            <Link
              to={t.to as never}
              activeOptions={{ exact: t.to.split("/").length <= 3 }}
              className="group flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-[11px] text-muted-foreground data-[status=active]:text-primary"
            >
              <span className="relative grid h-7 w-14 place-items-center rounded-full transition-colors group-data-[status=active]:bg-primary/12">
                <t.icon className="size-5" />
                {!!t.badge && (
                  <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {t.badge > 9 ? "9+" : t.badge}
                  </span>
                )}
              </span>
              <span className="font-medium">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Fab({
  icon: Icon,
  label,
  to,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  to?: string;
  onClick?: () => void;
}) {
  const cls =
    "fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex min-h-14 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-95";
  if (to)
    return (
      <Link to={to as never} className={cls}>
        <Icon className="size-5" /> {label}
      </Link>
    );
  return (
    <button onClick={onClick} className={cls}>
      <Icon className="size-5" /> {label}
    </button>
  );
}

/* ------------------------------------------------------------------ states */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className}`} />;
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-3xl" />
      ))}
    </div>
  );
}

export function Empty({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-border/70 px-6 py-12 text-center">
      {Icon && (
        <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="size-6" />
        </span>
      )}
      <p className="font-display text-sm font-semibold">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-5 text-center">
      <p className="text-sm font-medium text-destructive">Something went wrong</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {message ?? "Please check your connection and try again."}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground active:scale-95"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function Pill({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "primary" | "accent" | "warning" | "danger";
}) {
  const tones: Record<string, string> = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/12 text-primary",
    accent: "bg-accent/15 text-accent",
    warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    danger: "bg-destructive/12 text-destructive",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </div>
      <div className="mt-2 font-display text-xl font-bold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-60 ${className}`}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border px-4 text-sm font-medium transition active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------ pull to refresh */

/** Lightweight native-feeling pull-to-refresh (touch only, no dependencies). */
export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<unknown>;
  children: ReactNode;
}) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (window.scrollY > 0 || busy) return;
      start.current = e.touches[0]!.clientY;
    },
    [busy],
  );

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (start.current == null) return;
    const delta = e.touches[0]!.clientY - start.current;
    setPull(delta > 0 ? Math.min(delta * 0.45, 80) : 0);
  }, []);

  const onTouchEnd = useCallback(async () => {
    const shouldRefresh = pull > 55;
    start.current = null;
    setPull(0);
    if (!shouldRefresh) return;
    setBusy(true);
    try {
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }, [pull, onRefresh]);

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="grid place-items-center overflow-hidden text-primary transition-[height]"
        style={{ height: busy ? 44 : pull }}
      >
        <Loader2
          className={`size-5 ${busy ? "animate-spin" : ""}`}
          style={{ opacity: busy ? 1 : pull / 60 }}
        />
      </div>
      {children}
    </div>
  );
}

export function money(v: number | null | undefined) {
  return `$${Number(v ?? 0).toFixed(2)}`;
}

export function when(value: string | null | undefined, fallback = "ASAP") {
  if (!value) return fallback;
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
