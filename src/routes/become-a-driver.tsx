import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/page-hero";
import { Wallet, Clock, Route as RouteIcon, ShieldCheck, ArrowRight } from "lucide-react";

const title = "Become a Driver — Earn with Zwits Delivery";
const description =
  "Drive or ride with Zwits. Accept deliveries near you, follow live routes and get paid weekly to EcoCash, InnBucks or your bank.";

export const Route = createFileRoute("/become-a-driver")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.zwits.co.zw/become-a-driver" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.zwits.co.zw/become-a-driver" }],
  }),
  component: DriverPage,
});

const perks = [
  { icon: Wallet, title: "Weekly payouts", text: "Earnings land in your wallet the moment a drop is confirmed." },
  { icon: Clock, title: "Drive when you want", text: "Go online with one toggle, go offline just as fast." },
  { icon: RouteIcon, title: "Smart routing", text: "Batched deliveries and turn-by-turn navigation built in." },
  { icon: ShieldCheck, title: "Verified network", text: "Every sender and rider is ID-checked before they transact." },
];

const requirements = [
  "18 years or older with a valid Zimbabwean ID",
  "Valid driver's licence (or bicycle/e-bike for express riders)",
  "Roadworthy vehicle with registration papers",
  "Smartphone with data and location enabled",
  "Clean police clearance for parcel handling",
];

function DriverPage() {
  return (
    <SiteShell>
      <PageHero eyebrow="Drive with Zwits" title="Turn your vehicle into income.">
        Riders, motorbikes, vans and truck owners — accept deliveries near you and get paid for every trip.
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="rounded-2xl border border-border bg-card p-6">
                <Icon className="size-6 text-primary" />
                <h3 className="mt-4 font-display text-lg font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-8 md:p-10">
            <h2 className="font-display text-2xl font-bold">What you need</h2>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {requirements.map((r) => (
                <li key={r} className="flex gap-2.5">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-gold/30 bg-card p-8 md:p-10">
            <h2 className="font-display text-2xl font-bold">Getting started</h2>
            <ol className="mt-6 space-y-5 text-sm">
              {[
                ["Create your Zwits account", "One account works across every Zwits portal."],
                ["Activate the driver portal", "Switch to Driver from the role menu in your header."],
                ["Upload licence & vehicle papers", "Verification usually completes within 24 hours."],
                ["Go online and accept trips", "Deliveries near you appear the moment you're available."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-semibold">{t}</span>
                    <span className="block text-muted-foreground">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Link
              to="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              Start driving <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
