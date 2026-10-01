import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  FileText,
  PlugZap,
  Receipt,
  Users,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/marketing/reveal";
import { Breadcrumbs } from "@/components/seo/seo-landing";
import { seo, breadcrumbJsonLd, faqJsonLd, serviceJsonLd, type Crumb, type Faq } from "@/lib/seo";

const title = "Business Delivery Services in Zimbabwe | Zwits Business";
const description =
  "Reliable business delivery and logistics for Zimbabwean companies. Same-day dispatch and live delivery tracking in Harare with Zwits Business.";

const crumbs: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Business delivery", path: "/business" },
];

const faqs: Faq[] = [
  {
    q: "What is business delivery on Zwits?",
    a: "A managed delivery account for companies — you dispatch same-day or scheduled deliveries, track every job, and pay per trip. Monthly invoicing is coming soon.",
  },
  {
    q: "Which businesses use Zwits Business?",
    a: "Retailers, pharmacies, restaurants, wholesalers and corporate offices in Harare that need dependable last-mile delivery and service call-outs.",
  },
  {
    q: "How is business delivery priced?",
    a: "Pricing depends on distance, volume and how often you dispatch. Contact Zwits with your typical delivery volumes and we will quote an account rate.",
  },
  {
    q: "Can we get invoices and reporting?",
    a: "Not yet. Consolidated monthly invoices and reporting are on our roadmap. Today every delivery has its own record with live tracking.",
  },
];

export const Route = createFileRoute("/business")({
  head: () =>
    seo({
      title,
      description,
      path: "/business",
      jsonLd: [
        breadcrumbJsonLd(crumbs),
        serviceJsonLd({
          name: "Business delivery services",
          description,
          path: "/business",
          areaServed: "Harare",
        }),
        faqJsonLd(faqs),
      ],
    }),
  component: BusinessPage,
});

const capabilities = [
  { icon: Truck, title: "Track deliveries", text: "Every parcel, every driver, live on one operations board." },
  { icon: Users, title: "Manage employees", text: "Coming soon — seats and permissions for each team member." },
  { icon: Receipt, title: "Generate invoices", text: "Coming soon — consolidated monthly statements." },
  { icon: Boxes, title: "Book bulk deliveries", text: "Coming soon — dispatch a run of drop-offs in one action." },
  { icon: BarChart3, title: "Monitor analytics", text: "Coming soon — volumes, spend and on-time rate." },
  { icon: FileText, title: "Download reports", text: "Coming soon — CSV and PDF exports for finance." },
  { icon: PlugZap, title: "API integrations", text: "Coming soon — create jobs from your systems." },
  { icon: ShieldCheck, title: "Account controls", text: "Coming soon — approval limits and account management." },
];

function BusinessPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-5 pt-6 sm:px-8">
        <Breadcrumbs crumbs={crumbs} />
      </div>
      <PageHero eyebrow="Zwits Business" title="Business delivery solutions for Zimbabwean companies">
        Retailers, pharmacies, restaurants and corporates run their last-mile delivery and
        facilities work on Zwits — with live tracking today, and invoicing and team controls on the way.
      </PageHero>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-px overflow-hidden rounded-3xl border border-border/70 bg-border/40 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((c, i) => (
            <Reveal key={c.title} delay={i * 40}>
              <div className="h-full bg-background p-7 transition-colors hover:bg-card/60">
                <c.icon className="size-5 text-primary" />
                <h2 className="mt-6 font-display text-base font-semibold tracking-tight">{c.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 surface-elevated">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 md:grid-cols-3">
          {[
            ["Starter", "Pay as you go", "For small teams sending a few jobs a week.", ["Live tracking", "Cash payment", "Support via contact page"]],
            ["Growth", "Monthly account", "For businesses with recurring volume.", ["Coming soon: consolidated invoicing", "Coming soon: bulk dispatch", "Coming soon: analytics"]],
            ["Enterprise", "Custom", "For national operations and integrations.", ["Coming soon: API & webhooks", "Coming soon: custom reporting", "Volume pricing on request"]],
          ].map(([name, price, blurb, features], i) => (
            <Reveal key={name as string} delay={i * 80}>
              <div className="flex h-full flex-col rounded-3xl glass p-8 hover-lift hover:border-primary/40">
                <p className="font-display text-lg font-semibold">{name as string}</p>
                <p className="mt-1 text-sm text-gold">{price as string}</p>
                <p className="mt-4 text-sm text-muted-foreground">{blurb as string}</p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm text-muted-foreground">
                  {(features as string[]).map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/contact"
                  className="mt-8 inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold transition hover:bg-muted"
                >
                  Talk to sales <ArrowRight className="size-4" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-4 sm:px-8">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Business delivery FAQs</h2>
        <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
          {faqs.map((f) => (
            <details key={f.q} className="p-5">
              <summary className="cursor-pointer font-medium">{f.q}</summary>
              <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Also see <Link to="/delivery" className="text-primary underline">Zwits delivery in Zimbabwe</Link>,{" "}
          <Link to="/delivery/harare" className="text-primary underline">delivery in Harare</Link> and{" "}
          <Link to="/services" className="text-primary underline">services for your premises</Link>.
        </p>
      </section>


      <section className="mx-auto max-w-7xl px-5 py-24 text-center sm:px-8">
        <h2 className="mx-auto max-w-2xl text-balance-tight font-display text-3xl font-bold tracking-[-0.03em] md:text-5xl">
          Ready to put your operations on Zwits?
        </h2>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-glow">
            Create a business account
          </Link>
          <Link to="/contact" className="inline-flex items-center justify-center rounded-full glass px-8 py-4 text-sm font-semibold">
            Book a demo
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
