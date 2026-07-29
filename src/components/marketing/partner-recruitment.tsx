import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Star, TrendingUp, CalendarClock, Wallet } from "lucide-react";
import { Reveal } from "./reveal";

export function PartnerRecruitment() {
  const [jobs, setJobs] = useState(6);
  const [rate, setRate] = useState(12);
  const [days, setDays] = useState(5);

  const { gross, net, monthly } = useMemo(() => {
    const g = jobs * rate * days;
    const n = g * 0.85; // Zwits commission ~15%
    return { gross: g, net: n, monthly: n * 4.3 };
  }, [jobs, rate, days]);

  const money = (v: number) =>
    v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 md:py-32">
      <div className="grid gap-14 md:grid-cols-2 md:items-center">
        <Reveal>
          <p className="text-[12px] uppercase tracking-[0.22em] text-gold">Drivers &amp; providers</p>
          <h2 className="mt-4 text-balance-tight font-display text-4xl font-bold tracking-[-0.03em] md:text-5xl">
            Turn your skill into steady income.
          </h2>
          <p className="mt-5 max-w-lg text-muted-foreground md:text-lg">
            Ride, fix, clean, braid or consult — Zwits brings the work to your phone. You keep the
            majority of every job, paid straight to your wallet.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            {[
              { icon: CalendarClock, k: "Flexible", v: "Work when you want" },
              { icon: Wallet, k: "Fast payouts", v: "Direct to mobile wallet" },
              { icon: TrendingUp, k: "Grow", v: "Ratings win more jobs" },
            ].map((b) => (
              <div key={b.k} className="rounded-2xl border border-border/70 bg-card/40 p-4">
                <b.icon className="size-4 text-primary" />
                <p className="mt-3 text-sm font-semibold">{b.k}</p>
                <p className="text-xs text-muted-foreground">{b.v}</p>
              </div>
            ))}
          </div>

          <Link
            to="/become-a-provider"
            className="mt-9 inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-gold-foreground transition hover:opacity-90"
          >
            Apply to become a partner
          </Link>
        </Reveal>

        <Reveal delay={120}>
          <div className="rounded-3xl glass-strong p-6 md:p-8">
            <div className="flex items-center justify-between">
              <p className="font-display text-base font-semibold">Income calculator</p>
              <span className="rounded-full bg-primary/12 px-3 py-1 text-[11px] text-primary">Estimate</span>
            </div>

            <div className="mt-6 space-y-6">
              <Slider label="Jobs per day" value={jobs} min={1} max={20} onChange={setJobs} display={`${jobs}`} />
              <Slider label="Average job value" value={rate} min={3} max={80} onChange={setRate} display={money(rate)} />
              <Slider label="Days per week" value={days} min={1} max={7} onChange={setDays} display={`${days}`} />
            </div>

            <div className="mt-8 rounded-2xl border border-border/70 bg-background/60 p-6">
              <p className="text-xs text-muted-foreground">Estimated take-home per month</p>
              <p className="mt-1 font-display text-4xl font-bold tabular-nums">{money(monthly)}</p>
              <div className="mt-5 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <p className="tabular-nums text-sm font-semibold text-foreground">{money(gross)}</p>
                  Weekly gross
                </div>
                <div>
                  <p className="tabular-nums text-sm font-semibold text-foreground">{money(net)}</p>
                  Weekly after 15% commission
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 p-5">
              <div>
                <p className="text-xs text-muted-foreground">Top partner this week</p>
                <p className="mt-1 font-display text-lg font-semibold">Tatenda M. · Harare</p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm">
                <Star className="size-3.5 fill-gold text-gold" /> 4.96
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  display: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
        aria-label={label}
      />
    </label>
  );
}
