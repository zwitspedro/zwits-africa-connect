import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/page-hero";
import { Breadcrumbs } from "@/components/seo/seo-landing";
import { services } from "@/data/services";
import { seo, breadcrumbJsonLd, faqJsonLd, type Crumb, type Faq } from "@/lib/seo";

const crumbs: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
];

const faqs: Faq[] = [
  {
    q: "How do I book a service on Zwits?",
    a: "Pick the service you need, tell Zwits where and when, and the request goes to verified providers in that category and area. You confirm the booking once you are happy with the price.",
  },
  {
    q: "Are Zwits providers verified?",
    a: "Yes. Providers must complete identity verification and profile review before they can accept work, and ratings are only collected from completed jobs.",
  },
  {
    q: "Where does Zwits operate?",
    a: "Zwits is live in Harare and expanding across Zimbabwe. Coverage depends on how many verified providers are active in your category and area.",
  },
  {
    q: "How do I join as a service provider?",
    a: "Register as a provider, submit your documents for verification, and start receiving job requests in your trade and area. Listing is free — Zwits earns a commission on completed jobs.",
  },
];

export const Route = createFileRoute("/services/")({
  head: () =>
    seo({
      title: "Services & Service Providers in Zimbabwe | Zwits",
      description:
        "Find and book trusted service providers in Zimbabwe — plumbers, electricians, cleaners, mechanics, gardeners, beauty pros and more. Verified, priced up front, booked online.",
      path: "/services",
      jsonLd: [breadcrumbJsonLd(crumbs), faqJsonLd(faqs)],
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
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <Breadcrumbs crumbs={crumbs} />
      </div>
      <PageHero eyebrow="Services" title="Find trusted service providers in Zimbabwe">
        Customers discover and book verified professionals in minutes. Service providers join Zwits
        to receive job opportunities in their trade and area.
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

        <section className="mt-16 max-w-3xl">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Frequently asked questions</h2>
          <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
            {faqs.map((f) => (
              <details key={f.q} className="p-5">
                <summary className="cursor-pointer font-medium">{f.q}</summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Need something moved instead?{" "}
            <Link to="/delivery" className="text-primary underline">See Zwits delivery services</Link>. Run a business?{" "}
            <Link to="/business" className="text-primary underline">Explore business delivery solutions</Link>. Want work?{" "}
            <Link to="/providers" className="text-primary underline">Join Zwits as a service provider</Link>.
          </p>
        </section>
      </section>

    </SiteShell>
  );
}
