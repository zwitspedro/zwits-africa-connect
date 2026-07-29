import { CreditCard, Building2, UtensilsCrossed, ShoppingBag, HeartPulse, Plane, Briefcase, Home, Truck, GraduationCap } from "lucide-react";
import { Reveal } from "./reveal";

const verticals = [
  { icon: CreditCard, name: "Zwits Pay", status: "In build" },
  { icon: Building2, name: "Zwits Business", status: "Live" },
  { icon: UtensilsCrossed, name: "Zwits Food", status: "2026" },
  { icon: ShoppingBag, name: "Zwits Market", status: "2026" },
  { icon: HeartPulse, name: "Zwits Health", status: "2027" },
  { icon: Plane, name: "Zwits Travel", status: "2027" },
  { icon: Briefcase, name: "Zwits Jobs", status: "2027" },
  { icon: Home, name: "Zwits Property", status: "2027" },
  { icon: Truck, name: "Zwits Logistics", status: "Live" },
  { icon: GraduationCap, name: "Zwits Academy", status: "2027" },
];

export function EcosystemRoadmap() {
  return (
    <section className="relative overflow-hidden border-y border-border/60">
      <div className="pointer-events-none absolute inset-0 aurora opacity-30" />
      <div className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 md:py-32">
        <Reveal>
          <p className="text-[12px] uppercase tracking-[0.22em] text-gold">The roadmap</p>
          <h2 className="mt-4 max-w-3xl text-balance-tight font-display text-4xl font-bold tracking-[-0.03em] md:text-6xl">
            Building Africa&apos;s super app, one vertical at a time.
          </h2>
          <p className="mt-5 max-w-xl text-muted-foreground md:text-lg">
            One identity, one wallet, one trust layer — every new vertical plugs into the same
            platform rather than starting from scratch.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {verticals.map((v, i) => (
            <Reveal key={v.name} delay={i * 40}>
              <div className="group h-full rounded-2xl glass p-5 hover-lift hover:border-gold/40">
                <div className="flex items-start justify-between">
                  <v.icon className="size-5 text-primary" />
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      v.status === "Live"
                        ? "bg-primary/15 text-primary"
                        : v.status === "In build"
                          ? "bg-gold/15 text-gold"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {v.status}
                  </span>
                </div>
                <p className="mt-6 font-display text-sm font-semibold tracking-tight">{v.name}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
