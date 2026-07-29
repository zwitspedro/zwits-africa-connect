import { useEffect, useState } from "react";
import { MapPin, Wallet, Bell, CheckCircle2 } from "lucide-react";
import { Reveal } from "./reveal";

const screens = [
  {
    key: "tracking",
    label: "Live tracking",
    icon: MapPin,
    render: () => (
      <div className="flex h-full flex-col">
        <div className="relative flex-1 overflow-hidden rounded-2xl bg-card">
          <div className="absolute inset-0 grid-lines opacity-70" />
          <svg viewBox="0 0 200 260" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <path d="M20 230 C 70 200, 60 130, 110 100 S 170 50, 180 26" fill="none" stroke="var(--primary)" strokeWidth="3" strokeOpacity="0.35" />
            <path d="M20 230 C 70 200, 60 130, 110 100 S 170 50, 180 26" fill="none" stroke="var(--gold)" strokeWidth="3" className="animate-dash" />
            <circle cx="180" cy="26" r="5" fill="var(--gold)" />
            <circle cx="20" cy="230" r="5" fill="var(--primary)" />
          </svg>
        </div>
        <div className="mt-3 rounded-2xl bg-card p-3">
          <p className="text-[10px] text-muted-foreground">Arriving in</p>
          <p className="font-display text-xl font-bold">7 min</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Tatenda M. · AEK 4432</p>
        </div>
      </div>
    ),
  },
  {
    key: "wallet",
    label: "Wallet",
    icon: Wallet,
    render: () => (
      <div className="flex h-full flex-col gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-primary/25 to-gold/20 p-4">
          <p className="text-[10px] text-muted-foreground">Zwits balance</p>
          <p className="mt-1 font-display text-2xl font-bold">US$ 184.50</p>
        </div>
        {["Delivery · Avondale", "Cleaning · Borrowdale", "Top-up · EcoCash"].map((t, i) => (
          <div key={t} className="flex items-center justify-between rounded-xl bg-card px-3 py-2.5 text-[11px]">
            <span className="text-muted-foreground">{t}</span>
            <span className={i === 2 ? "text-primary" : ""}>{i === 2 ? "+$50" : "-$12"}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: "bookings",
    label: "Bookings",
    icon: CheckCircle2,
    render: () => (
      <div className="flex h-full flex-col gap-3">
        {[
          ["Plumbing repair", "Today · 14:00", "Confirmed"],
          ["Grocery delivery", "Today · 17:30", "En route"],
          ["Home cleaning", "Sat · 09:00", "Scheduled"],
        ].map(([t, w, s]) => (
          <div key={t} className="rounded-2xl bg-card p-3">
            <p className="text-[11px] font-semibold">{t}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{w}</p>
            <span className="mt-2 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[9px] text-primary">{s}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: "alerts",
    label: "Notifications",
    icon: Bell,
    render: () => (
      <div className="flex h-full flex-col gap-3">
        {[
          ["Rider assigned", "Tatenda is on the way"],
          ["Payment received", "US$ 12.00 · Delivery"],
          ["Rate your job", "How was your cleaner?"],
        ].map(([t, s]) => (
          <div key={t} className="rounded-2xl bg-card p-3">
            <p className="text-[11px] font-semibold">{t}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{s}</p>
          </div>
        ))}
      </div>
    ),
  },
];

export function AppPreview() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % screens.length), 4200);
    return () => clearInterval(t);
  }, []);

  const active = screens[i];

  return (
    <section className="relative overflow-hidden border-y border-border/60 surface-elevated">
      <div className="pointer-events-none absolute inset-0 aurora opacity-25" />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-8 md:grid-cols-2 md:items-center md:py-32">
        <Reveal>
          <p className="text-[12px] uppercase tracking-[0.22em] text-gold">Mobile</p>
          <h2 className="mt-4 text-balance-tight font-display text-4xl font-bold tracking-[-0.03em] md:text-5xl">
            The whole ecosystem, in your pocket.
          </h2>
          <p className="mt-5 max-w-lg text-muted-foreground md:text-lg">
            Track a rider, pay from your wallet, manage bookings and stay notified — a single app
            for everything Zwits does.
          </p>
          <div className="mt-9 flex flex-wrap gap-2">
            {screens.map((s, idx) => (
              <button
                key={s.key}
                onClick={() => setI(idx)}
                aria-pressed={idx === i}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                  idx === i ? "bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                <s.icon className="size-4" />
                {s.label}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={120} className="flex justify-center">
          <div className="animate-float relative w-[268px] rounded-[2.6rem] border border-border/80 bg-background p-3 shadow-glow">
            <div className="absolute left-1/2 top-3 h-5 w-24 -translate-x-1/2 rounded-full bg-card" />
            <div className="h-[520px] rounded-[2rem] bg-background/80 p-4 pt-10">
              <p className="mb-3 font-display text-sm font-semibold">{active.label}</p>
              <div key={active.key} className="animate-rise h-[430px]">{active.render()}</div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
