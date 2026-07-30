import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { services } from "@/data/services";
import { Reveal } from "./reveal";

export function ServiceCategories() {
  return (
    <section id="services" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 md:py-32">
      <Reveal>
        <p className="text-[12px] uppercase tracking-[0.22em] text-gold">The ecosystem</p>
        <h2 className="mt-4 max-w-3xl text-balance-tight font-display text-4xl font-bold tracking-[-0.03em] md:text-6xl">
          Every service your day needs, in one place.
        </h2>
        <p className="mt-5 max-w-xl text-muted-foreground md:text-lg">
          From a parcel across town to a plumber, a tutor or a corporate logistics run — one
          account, one wallet, one standard of trust.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.slug} delay={i * 50}>
              <Link
                to="/services/$slug"
                params={{ slug: s.slug }}
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/50 p-7 hover-lift hover:border-primary/50 hover:shadow-glow"
              >
                <div
                  className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: "color-mix(in oklab, var(--primary) 28%, transparent)" }}
                />
                <div className="relative grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-6" />
                </div>
                <h3 className="relative mt-7 font-display text-xl font-semibold tracking-tight">{s.name}</h3>
                <p className="relative mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                <div className="relative mt-6 flex flex-wrap gap-1.5">
                  {s.examples.slice(0, 3).map((e) => (
                    <span key={e} className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                      {e}
                    </span>
                  ))}
                </div>
                <span className="relative mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  View service
                  <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
