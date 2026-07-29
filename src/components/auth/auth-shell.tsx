import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Lock, Sparkles, TrendingUp, Truck, Wallet } from "lucide-react";

type Variant = "customer" | "provider";

const PANEL: Record<
  Variant,
  { eyebrow: string; headline: string; blurb: string; points: { icon: typeof Lock; text: string }[] }
> = {
  customer: {
    eyebrow: "Customer workspace",
    headline: "Everything you need, one trusted account.",
    blurb: "Book verified professionals, follow every job live and keep your wallet in one place.",
    points: [
      { icon: BadgeCheck, text: "Vetted, background-checked professionals" },
      { icon: Truck, text: "Live tracking on jobs and deliveries" },
      { icon: Wallet, text: "One wallet for bookings, tips and refunds" },
    ],
  },
  provider: {
    eyebrow: "Professional workspace",
    headline: "Run your business from one place.",
    blurb: "Receive dispatched jobs, quote instantly, get paid out weekly and grow your rating.",
    points: [
      { icon: Sparkles, text: "Smart dispatch sends jobs straight to you" },
      { icon: TrendingUp, text: "Growth centre with coaching and analytics" },
      { icon: Wallet, text: "Transparent earnings and fast payouts" },
    ],
  },
};

/** Split-screen premium auth layout, mobile-first with a brand panel on large screens. */
export function AuthShell({
  variant,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  variant: Variant;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const panel = PANEL[variant];

  return (
    <div className="relative isolate min-h-screen bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
      <div className="pointer-events-none absolute inset-0 -z-20 aurora opacity-60" />
      <div className="pointer-events-none absolute inset-0 -z-10 grid-lines" />

      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-border/60 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link to="/" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to zwits.co.zw
        </Link>

        <div className="max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full glass px-3.5 py-1.5 text-[12px] text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            {panel.eyebrow}
          </span>
          <h2 className="animate-rise mt-6 font-display text-4xl font-bold leading-[1.08] tracking-[-0.03em]">
            {panel.headline}
          </h2>
          <p className="animate-rise mt-4 text-[15px] leading-relaxed text-muted-foreground" style={{ animationDelay: "80ms" }}>
            {panel.blurb}
          </p>

          <ul className="mt-9 space-y-4">
            {panel.points.map((p, i) => (
              <li
                key={p.text}
                className="animate-rise flex items-start gap-3 text-sm text-muted-foreground"
                style={{ animationDelay: `${140 + i * 70}ms` }}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <p.icon className="size-4" />
                </span>
                <span className="pt-2">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="size-3.5 text-gold" />
          Encrypted sessions · OTP verification · suspicious-login alerts
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-screen flex-col justify-center px-5 py-10 sm:px-8 lg:px-14">
        <Link to="/" className="mb-8 inline-flex w-fit items-center gap-2 text-sm text-muted-foreground lg:hidden">
          <ArrowLeft className="size-4" />
          Back home
        </Link>

        <div className={`animate-rise mx-auto w-full ${wide ? "max-w-2xl" : "max-w-md"}`}>
          <h1 className="font-display text-[2rem] font-bold leading-tight tracking-[-0.03em] sm:text-4xl">{title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>

          <div className="mt-8 rounded-3xl border border-border/70 bg-card/80 p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-8">
            {children}
          </div>

          {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
