import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/page-hero";
import { Package, MapPin, Timer, ShieldCheck, Bike, Building2, ArrowRight } from "lucide-react";

const title = "Delivery — Same-day courier across Zimbabwe | Zwits";
const description =
  "Send parcels, documents and shop orders across Harare, Bulawayo and beyond with live-tracked Zwits delivery riders and drivers.";

export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.zwits.co.zw/delivery" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.zwits.co.zw/delivery" }],
  }),
  component: DeliveryPage,
});

const options = [
  { icon: Bike, title: "Express bike", text: "Documents and small parcels under 10kg, picked up within 20 minutes.", price: "from $3" },
  { icon: Package, title: "Standard van", text: "Boxes, groceries and bulk shop orders across the city.", price: "from $12" },
  { icon: Building2, title: "Business courier", text: "Scheduled daily runs, bulk drops and monthly invoicing.", price: "custom" },
];

const steps = [
  { icon: MapPin, title: "Set pickup & drop-off", text: "Enter both addresses and we price the trip instantly." },
  { icon: Timer, title: "Matched in seconds", text: "The nearest verified driver accepts and heads to pickup." },
  { icon: ShieldCheck, title: "Tracked to the door", text: "Watch the route live and get proof of delivery on arrival." },
];

function DeliveryPage() {
  return (
    <SiteShell>
      <PageHero eyebrow="Zwits Delivery" title="Anything, anywhere in the city — today.">
        Live-tracked couriers for parcels, documents and shop runs. Pay on delivery or from your Zwits wallet.
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-bold">Choose how it moves</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {options.map((o) => {
            const Icon = o.icon;
            return (
              <div key={o.title} className="rounded-2xl border border-border bg-card p-6">
                <Icon className="size-6 text-primary" />
                <div className="mt-4 flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold">{o.title}</h3>
                  <span className="text-sm font-medium text-gold">{o.price}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{o.text}</p>
              </div>
            );
          })}
        </div>

        <h2 className="mt-20 font-display text-3xl font-bold">How a delivery works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary/12 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-16 flex flex-col gap-3 rounded-3xl border border-gold/30 bg-card p-8 sm:flex-row sm:items-center sm:justify-between md:p-10">
          <div>
            <h2 className="font-display text-2xl font-bold">Ready to send something?</h2>
            <p className="mt-2 text-muted-foreground">Create an account and book your first delivery in under a minute.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
              Send a parcel <ArrowRight className="size-4" />
            </Link>
            <Link to="/become-a-driver" className="inline-flex items-center rounded-full border border-border px-6 py-3 text-sm font-semibold">
              Drive with us
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
