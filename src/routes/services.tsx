import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/page-hero";
import { services } from "@/data/services";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Zwits" },
      { name: "description", content: "Deliveries, transport, repairs, cleaning, farming, beauty, freelance and emergency services on Zwits." },
      { property: "og:url", content: "https://zwits-africa-connect.lovable.app/services" },
    ],
    links: [{ rel: "canonical", href: "https://zwits-africa-connect.lovable.app/services" }],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  return (
    <SiteShell>
      <PageHero eyebrow="Services" title="One app. Eight ways to get it done.">
        Tap a category to see what's possible. New services launch every quarter.
      </PageHero>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.slug} className="rounded-2xl border border-border bg-card p-6">
                <div className="grid size-12 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="size-6" />
                </div>
                <h2 className="mt-5 font-display text-xl font-semibold">{s.name}</h2>
                <p className="mt-1 text-sm text-gold">{s.tagline}</p>
                <p className="mt-3 text-sm text-muted-foreground">{s.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.examples.map((e) => (
                    <span key={e} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{e}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </SiteShell>
  );
}
