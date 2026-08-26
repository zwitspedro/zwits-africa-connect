import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/page-hero";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Zwits" },
      { name: "description", content: "Zwits is a modern African marketplace connecting customers with trusted local service providers." },
      { property: "og:url", content: "https://www.zwits.co.zw/about" },
    ],
    links: [{ rel: "canonical", href: "https://www.zwits.co.zw/about" }],
  }),
  component: About,
});

function About() {
  return (
    <SiteShell>
      <PageHero eyebrow="About" title="Built in Africa, for the way Africa moves.">
        Zwits exists to make the everyday easier — and to put more money in the hands of local entrepreneurs.
      </PageHero>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-4 text-muted-foreground">
            <p>From a delivery to a deep clean, getting things done in our cities should be a tap away. We started Zwits because the everyday economy is huge, informal and full of incredible people — they just needed better tools.</p>
            <p>Today Zwits matches thousands of customers with verified riders, drivers, technicians, cleaners, farmers, stylists and freelancers across Zimbabwe — and we're just getting started.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              ["2024", "Founded"],
              ["3", "Cities live"],
              ["1,400+", "Providers earning"],
              ["12k+", "Customers served"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-border bg-card p-6">
                <p className="font-display text-3xl font-bold">{v}</p>
                <p className="mt-1 text-sm text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
