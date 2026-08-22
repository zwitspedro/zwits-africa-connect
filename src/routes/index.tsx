import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bike, HardHat, Search } from "lucide-react";

/**
 * Zwits entry screen — deliberately the lightest route in the app.
 *
 * HARD RULES for this file (data-light architecture):
 *  - No Supabase import, no auth check, no network request of any kind.
 *  - No SiteShell / SiteHeader (those pull the auth session + notification
 *    polling), no maps, no images, no provider lists, no animation libraries.
 *  - Icons only, never photographs.
 *
 * Everything else is one tap away and loads on demand.
 */

const title = "Zwits — Book a service, join as a provider, deliver in Zimbabwe";
const description =
  "Zwits connects Zimbabwe. Book a trusted service provider, join Zwits as a professional, or earn as a delivery partner. Fast, even on slow mobile data.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://zwits.co.zw/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://zwits.co.zw/" }],
  }),
  component: Entry,
});

type Choice = {
  to: string;
  icon: typeof Bike;
  kicker: string;
  title: string;
  blurb: string;
};

const choices: Choice[] = [
  {
    to: "/book",
    icon: Search,
    kicker: "Customer",
    title: "Book a service",
    blurb: "Plumbers, electricians, cleaners, riders and more — near you, rated and verified.",
  },
  {
    to: "/provider",
    icon: HardHat,
    kicker: "Service provider",
    title: "Join Zwits",
    blurb: "Receive jobs in your trade and your area. Get paid after every completed job.",
  },
  {
    to: "/become-a-driver",
    icon: Bike,
    kicker: "Delivery provider",
    title: "Deliver with Zwits",
    blurb: "Use your bike, car or truck to run same-day deliveries across your city.",
  },
];

function Entry() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 pt-6">
        <span className="font-display text-lg font-bold tracking-[-0.03em]">
          Zwits<span className="text-primary">.</span>
        </span>
        <Link
          to="/home"
          className="rounded-full px-3 py-2 text-[13px] text-muted-foreground transition hover:text-foreground"
        >
          About Zwits
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-10 pt-8">
        <h1 className="font-display text-[2rem] font-bold leading-[1.08] tracking-[-0.035em] sm:text-[2.6rem]">
          One platform.
          <br />
          Every service.
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          Zimbabwe&apos;s services network. Pick where you want to start.
        </p>

        <nav aria-label="Get started" className="mt-8 grid gap-3">
          {choices.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-4 transition active:scale-[0.99] hover:border-primary/50"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <c.icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {c.kicker}
                </span>
                <span className="mt-0.5 block text-base font-bold tracking-[-0.01em]">
                  {c.title}
                </span>
                <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">
                  {c.blurb}
                </span>
              </span>
              <ArrowRight
                className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden
              />
            </Link>
          ))}
        </nav>

        <section aria-label="Sign in" className="mt-8 border-t border-border/70 pt-5">
          <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            Already with Zwits?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/login"
              className="rounded-full border border-border px-4 py-2 text-[13px] font-medium transition hover:bg-muted"
            >
              Customer login
            </Link>
            <Link
              to="/provider-login"
              className="rounded-full border border-border px-4 py-2 text-[13px] font-medium text-primary transition hover:bg-muted"
            >
              Provider login
            </Link>
            <Link
              to="/provider-login"
              className="rounded-full border border-border px-4 py-2 text-[13px] font-medium transition hover:bg-muted"
            >
              Driver login
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-2xl px-5 pb-8">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
          <Link to="/services" className="hover:text-foreground">
            All services
          </Link>
          <Link to="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link to="/faq" className="hover:text-foreground">
            Help
          </Link>
          <Link to="/contact" className="hover:text-foreground">
            Contact
          </Link>
          <Link to="/business" className="hover:text-foreground">
            For business
          </Link>
        </div>
      </footer>
    </div>
  );
}
