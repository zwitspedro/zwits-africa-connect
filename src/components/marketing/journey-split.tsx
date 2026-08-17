import { Link } from "@tanstack/react-router";
import { ArrowRight, Briefcase, LogIn, Search, Truck } from "lucide-react";

/**
 * Two clearly separated primary journeys — customers booking a service and
 * professionals joining or signing into the provider portal. Deliberately
 * placed high on the homepage and never hidden behind a menu.
 */
export function JourneySplit() {
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-5 py-12 sm:px-8 md:grid-cols-2 md:py-16">
        <div className="rounded-3xl border border-border/70 bg-card/70 p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Customers</p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Need something done?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Book verified professionals and deliveries near you, track them live and pay securely.
          </p>
          <div className="mt-6 grid gap-2.5">
            <Link
              to="/services"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground transition hover:opacity-90"
            >
              <Search className="size-4" /> Book a service
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-background/60 px-6 text-sm font-semibold transition hover:bg-muted"
            >
              <LogIn className="size-4" /> Customer login
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card/70 p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-secondary">Service providers</p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Looking for work?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tradespeople, cleaners, beauty pros, freelancers and delivery drivers — receive jobs and get paid.
          </p>
          <div className="mt-6 grid gap-2.5">
            <Link
              to="/provider-signup"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-foreground px-6 text-sm font-bold text-background transition hover:opacity-90"
            >
              <Briefcase className="size-4" /> Join as a provider
            </Link>
            <Link
              to="/provider-login"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-background/60 px-6 text-sm font-semibold transition hover:bg-muted"
            >
              <LogIn className="size-4" /> Provider login
            </Link>
            <Link
              to="/provider-login"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              <Truck className="size-4" /> Delivery provider login
            </Link>
            <Link
              to="/provider"
              className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Visit the provider hub <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
