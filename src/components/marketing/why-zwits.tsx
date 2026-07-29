import { ShieldCheck, Radar, Wallet, Headset, BadgeCheck, LifeBuoy } from "lucide-react";
import { Reveal } from "./reveal";

const pillars = [
  { icon: ShieldCheck, title: "Verified by default", text: "Every provider passes ID, selfie and business document checks with a full audit trail before their first job." },
  { icon: Radar, title: "Intelligent matching", text: "Location, availability and performance data route each request to the right partner in seconds." },
  { icon: Wallet, title: "Secure payments", text: "Funds are held and released on completion, with transparent commissions and reconciled payouts." },
  { icon: BadgeCheck, title: "Service guarantees", text: "Ratings, quality thresholds and re-dispatch policies keep standards consistently high." },
  { icon: Headset, title: "Real human support", text: "In-app chat and call for every booking, backed by a trained support team." },
  { icon: LifeBuoy, title: "Emergency ready", text: "Round-the-clock urgent response for roadside, locksmith and medical transport." },
];

export function WhyZwits() {
  return (
    <section className="relative border-y border-border/60 surface-elevated">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 md:py-32">
        <Reveal>
          <p className="text-[12px] uppercase tracking-[0.22em] text-gold">Why Zwits</p>
          <h2 className="mt-4 max-w-3xl text-balance-tight font-display text-4xl font-bold tracking-[-0.03em] md:text-6xl">
            Infrastructure-grade trust, in an everyday app.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-border/70 bg-border/40 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p, i) => (
            <Reveal key={p.title} delay={i * 40}>
              <div className="group h-full bg-background p-8 transition-colors hover:bg-card/60">
                <p.icon className="size-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                <h3 className="mt-6 font-display text-lg font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
