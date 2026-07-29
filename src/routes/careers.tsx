import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/page-hero";
import { MapPin, Briefcase, ArrowRight } from "lucide-react";

const title = "Careers — Build Africa's services platform | Zwits";
const description =
  "Join the Zwits team in Harare or remotely. Open roles in engineering, operations, design and growth across our digital services ecosystem.";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.zwits.co.zw/careers" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.zwits.co.zw/careers" }],
  }),
  component: CareersPage,
});

const values = [
  ["Ship for real people", "Every release is judged by whether a customer in Mbare or Bulawayo feels it."],
  ["Own the outcome", "Small teams, wide scope, no hand-offs into the void."],
  ["Build for the continent", "What works in Harare should scale to Lusaka, Lagos and Nairobi."],
];

const roles = [
  { title: "Senior Full-stack Engineer", team: "Engineering", location: "Harare / Remote", type: "Full-time" },
  { title: "Mobile Engineer (React Native)", team: "Engineering", location: "Remote", type: "Full-time" },
  { title: "Operations Lead — Delivery", team: "Operations", location: "Harare", type: "Full-time" },
  { title: "Provider Success Manager", team: "Operations", location: "Bulawayo", type: "Full-time" },
  { title: "Product Designer", team: "Design", location: "Remote", type: "Contract" },
  { title: "Growth Marketer", team: "Growth", location: "Harare", type: "Full-time" },
];

function CareersPage() {
  return (
    <SiteShell>
      <PageHero eyebrow="Careers" title="Come build the everyday layer of African life.">
        We're a small, fast team building the platform that connects customers, providers, drivers and businesses across Zimbabwe.
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {values.map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold">{t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-20 font-display text-3xl font-bold">Open roles</h2>
        <div className="mt-8 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
          {roles.map((r) => (
            <div key={r.title} className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">{r.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Briefcase className="size-3.5" /> {r.team}</span>
                  <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" /> {r.location}</span>
                  <span className="rounded-full border border-border px-2.5 py-0.5">{r.type}</span>
                </div>
              </div>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold"
              >
                Apply <ArrowRight className="size-4" />
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-gold/30 bg-card p-8 md:p-10">
          <h2 className="font-display text-2xl font-bold">Don't see your role?</h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Send us what you'd build at Zwits and why. We read every note and hire ahead of the roles we post.
          </p>
          <Link
            to="/contact"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Get in touch <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
