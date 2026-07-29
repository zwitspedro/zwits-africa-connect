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

const title = "Zwits Business — Enterprise logistics & service accounts";
const description =
  "Corporate deliveries, bulk logistics, monthly accounts, invoicing, analytics and API integrations for businesses running on Zwits.";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://zwits.co.zw/business" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://zwits.co.zw/business" }],
  }),
  component: BusinessPage,
});

const capabilities = [
  { icon: Truck, title: "Track deliveries", text: "Every parcel, every driver, live on one operations board." },
  { icon: Users, title: "Manage employees", text: "Seats, permissions and cost centres for each team member." },
  { icon: Receipt, title: "Generate invoices", text: "Consolidated monthly statements with per-job line items." },
  { icon: Boxes, title: "Book bulk deliveries", text: "Upload a run of drop-offs and dispatch them in one action." },
  { icon: BarChart3, title: "Monitor analytics", text: "Volumes, spend, on-time rate and cost per delivery over time." },
  { icon: FileText, title: "Download reports", text: "Export CSV or PDF for finance, audit and reconciliation." },
  { icon: PlugZap, title: "API integrations", text: "Create jobs and receive webhooks straight from your systems." },
  { icon: ShieldCheck, title: "Account controls", text: "Approval limits, SLAs and a named account manager." },
];

function BusinessPage() {
  return (
    <SiteShell>
      <PageHero eyebrow="Zwits Business" title="Enterprise operations, without the overhead.">
        Retailers, pharmacies, restaurants and corporates run their last mile and facilities work
        on Zwits — with the controls a finance team expects.
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
            ["Starter", "Pay as you go", "For small teams sending a few jobs a week.", ["Live tracking", "Card & cash payment", "Email support"]],
            ["Growth", "Monthly account", "For businesses with recurring volume.", ["Consolidated invoicing", "Bulk dispatch", "Analytics dashboard", "Priority support"]],
            ["Enterprise", "Custom", "For national operations and integrations.", ["API & webhooks", "Dedicated capacity", "SLAs & account manager", "Custom reporting"]],
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
