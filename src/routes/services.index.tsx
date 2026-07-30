import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/page-hero";
import { services } from "@/data/services";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "All Services — Book Verified Pros | Zwits" },
      { name: "description", content: "Browse every Zwits service — deliveries, transport, repairs, cleaning, farming, beauty, freelance and emergency. Tap a service to see pricing, verified providers and book instantly." },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "All Services — Book Verified Pros | Zwits" },
      { property: "og:description", content: "Tap any service to see pricing, verified providers and book in minutes." },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://zwits-africa-connect.lovable.app/services" },
    ],
    links: [{ rel: "canonical", href: "https://zwits-africa-connect.lovable.app/services" }],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return services;
    return services.filter((s) =>
      [s.name, s.tagline, s.description, ...s.examples].join(" ").toLowerCase().includes(term),
    );
  }, [q]);

  return (
    <SiteShell>
      <PageHero eyebrow="Services" title="Pick a service. We handle the rest.">
        Tap a category to see pricing, verified providers and start a booking — your choice
        follows you through every step.
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <label className="relative mx-auto flex max-w-xl items-center">
          <Search className="pointer-events-none absolute left-4 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search services — plumbing, cleaning, tutor…"
            aria-label="Search services"
            className="w-full rounded-full border border-input bg-background py-3 pl-11 pr-4 text-sm outline-none focus:border-primary"
          />
        </label>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.slug}
                to="/services/$slug"
                params={{ slug: s.slug }}
                className="group flex flex-col rounded-3xl border border-border/70 bg-card/60 p-6 transition hover:border-primary/50 hover:shadow-glow"
              >
                <div className="grid size-12 place-items-center rounded-xl bg-primary/15 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-6" />
                </div>
                <h2 className="mt-5 font-display text-xl font-semibold">{s.name}</h2>
                <p className="mt-1 text-sm text-gold">{s.tagline}</p>
                <p className="mt-3 flex-1 text-sm text-muted-foreground">{s.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.examples.map((e) => (
                    <span key={e} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{e}</span>
                  ))}
                </div>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  View service
                  <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            );
          })}
        </div>

        {results.length === 0 && (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            No service matches “{q}”. <Link to="/contact" className="text-primary underline">Ask support</Link> and we'll find someone.
          </p>
        )}
      </section>
    </SiteShell>
  );
}
