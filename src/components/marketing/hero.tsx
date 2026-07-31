import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ShieldCheck, Star, Clock, Siren } from "lucide-react";
import { services, popularServices } from "@/data/services";
import { ServiceSearch } from "./service-search";

/**
 * Zimbabwe-first hero: answers "what service do you need today?" on first paint,
 * with a search bar, primary CTA, emergency shortcut and popular service chips.
 */
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border/60">
      <div className="pointer-events-none absolute inset-0 -z-20 aurora opacity-70" />
      <div className="pointer-events-none absolute inset-0 -z-10 grid-lines" />

      <div className="mx-auto w-full max-w-7xl px-5 pb-16 pt-14 sm:px-8 md:pb-24 md:pt-20">
        <div className="animate-rise inline-flex items-center gap-2.5 rounded-full glass px-4 py-1.5 text-[13px] text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-gold" />
          </span>
          Zimbabwe&apos;s super app for services — live in Harare, Bulawayo &amp; Mutare
        </div>

        <h1
          className="animate-rise mt-7 max-w-3xl text-balance-tight font-display text-[2.4rem] font-bold leading-[1.05] tracking-[-0.035em] sm:text-6xl md:text-[4.25rem]"
          style={{ animationDelay: "80ms" }}
        >
          What service do you
          <br className="hidden sm:block" /> need <span className="text-gradient-fire">today?</span>
        </h1>

        <p
          className="animate-rise mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-lg"
          style={{ animationDelay: "140ms" }}
        >
          Book verified plumbers, electricians, cleaners, riders and more — vetted, rated and
          near you. Pay with EcoCash, InnBucks, card or cash on completion.
        </p>

        <div className="animate-rise mt-8" style={{ animationDelay: "200ms" }}>
          <ServiceSearch />
        </div>

        <div className="animate-rise mt-5 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "240ms" }}>
          <Link
            to="/services"
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            Book a Service
            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <Link
            to="/services/$slug"
            params={{ slug: "emergency" }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-7 py-3.5 text-[15px] font-semibold text-destructive transition hover:bg-destructive/10"
          >
            <Siren className="size-4" />
            Emergency Services
          </Link>
        </div>

        {/* Popular service chips — every icon links to its own page */}
        <div className="animate-rise mt-8 flex flex-wrap gap-2" style={{ animationDelay: "300ms" }}>
          {popularServices.slice(0, 6).map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.slug}
                to="/services/$slug"
                params={{ slug: s.slug }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-medium transition hover:border-primary/50 hover:text-primary"
              >
                <Icon className="size-4 text-primary" />
                {s.name}
              </Link>
            );
          })}
          <Link
            to="/services"
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 py-2 text-[13px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            All {services.length} services
          </Link>
        </div>

        <div
          className="animate-rise mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-[13px] text-muted-foreground"
          style={{ animationDelay: "340ms" }}
        >
          <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-gold" /> ID-verified professionals</span>
          <span className="inline-flex items-center gap-2"><Star className="size-4 text-gold" /> Ratings &amp; reviews on every job</span>
          <span className="inline-flex items-center gap-2"><Clock className="size-4 text-gold" /> Live tracking from accept to complete</span>
        </div>
      </div>
    </section>
  );
}
