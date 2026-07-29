import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/page-hero";
import { Check, ArrowRight } from "lucide-react";

const title = "Pricing — Transparent service & commission rates | Zwits";
const description =
  "See what customers pay, what providers keep and how Zwits business plans are priced. No hidden fees, no subscriptions to book.";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.zwits.co.zw/pricing" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.zwits.co.zw/pricing" }],
  }),
  component: PricingPage,
});

const plans = [
  {
    name: "Customer",
    price: "Free",
    note: "You only pay for the job you book.",
    features: [
      "No booking or subscription fee",
      "Upfront quotes before you accept",
      "Pay by EcoCash, InnBucks, card or cash",
      "Free cancellation before a provider is on the way",
    ],
    cta: { label: "Book a service", to: "/signup" },
  },
  {
    name: "Provider",
    price: "12%",
    note: "Commission per completed job — nothing upfront.",
    features: [
      "Free verification and listing",
      "Keep 88% of every job",
      "Weekly payouts to mobile money or bank",
      "Growth Center, analytics and marketing tools included",
    ],
    cta: { label: "Become a provider", to: "/become-a-provider" },
    featured: true,
  },
  {
    name: "Business",
    price: "Custom",
    note: "Volume rates with monthly invoicing.",
    features: [
      "Bulk and recurring bookings",
      "Employee accounts with spend limits",
      "Consolidated monthly invoices",
      "Dedicated account manager",
    ],
    cta: { label: "Talk to sales", to: "/contact" },
  },
];

const faqs = [
  ["Are there hidden fees?", "No. The quote you accept is the price you pay — commission is deducted on the provider side."],
  ["When do providers get paid?", "Earnings clear to your Zwits wallet on job completion and can be withdrawn weekly."],
  ["Do delivery prices differ?", "Yes — delivery is priced by distance and vehicle type, shown before you confirm."],
];

function PricingPage() {
  return (
    <SiteShell>
      <PageHero eyebrow="Pricing" title="Clear prices. No surprises.">
        Booking on Zwits is free. Providers pay a flat commission only when they earn.
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-3xl border p-8 ${p.featured ? "border-gold/40 bg-card shadow-glow" : "border-border bg-card"}`}
            >
              <h2 className="font-display text-lg font-semibold">{p.name}</h2>
              <p className="mt-4 font-display text-4xl font-bold tracking-tight">{p.price}</p>
              <p className="mt-2 text-sm text-muted-foreground">{p.note}</p>
              <ul className="mt-6 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={p.cta.to}
                className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold ${
                  p.featured ? "bg-primary text-primary-foreground" : "border border-border"
                }`}
              >
                {p.cta.label} <ArrowRight className="size-4" />
              </Link>
            </div>
          ))}
        </div>

        <h2 className="mt-20 font-display text-3xl font-bold">Pricing questions</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {faqs.map(([q, a]) => (
            <div key={q} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-base font-semibold">{q}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
