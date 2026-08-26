import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { SeoLanding } from "@/components/seo/seo-landing";
import { HARARE_SUBURBS, findSuburb } from "@/data/locations";
import {
  seo,
  breadcrumbJsonLd,
  faqJsonLd,
  serviceJsonLd,
  type Crumb,
} from "@/lib/seo";

/** Unique, hand-written meta per suburb — never templated name-swaps. */
const META: Record<string, { title: string; description: string; h1: string }> = {
  cbd: {
    title: "Delivery in Harare CBD | Document & Supplier Runs | Zwits",
    description:
      "Bike and van delivery across Harare CBD — document runs, bank and government paperwork, and paid supplier collections around First Street and the Kopje.",
    h1: "Delivery in the Harare CBD",
  },
  avondale: {
    title: "Delivery in Avondale, Harare | Same-Day Courier | Zwits",
    description:
      "Same-day delivery in Avondale and Belgravia. Shop and pharmacy orders, household parcels and small-office courier runs, booked online and tracked to the door.",
    h1: "Delivery in Avondale",
  },
  borrowdale: {
    title: "Delivery in Borrowdale, Harare | Bike & Van | Zwits",
    description:
      "Delivery into Borrowdale, Brooke and Gunhill. Retail-to-home orders and bulky van loads, with estate gate access handled through the booking details.",
    h1: "Delivery in Borrowdale",
  },
  marlborough: {
    title: "Delivery in Marlborough, Harare | Local Courier | Zwits",
    description:
      "Zwits is based in Marlborough. Short same-suburb parcel runs, home-business collections and cross-city drops, priced on distance before you confirm.",
    h1: "Delivery in Marlborough",
  },
};

export const Route = createFileRoute("/delivery/harare/$suburb")({
  loader: ({ params }) => {
    const suburb = findSuburb(params.suburb);
    if (!suburb) throw notFound();
    return { suburb };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Delivery area unavailable — Zwits" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { suburb } = loaderData;
    const path = `/delivery/harare/${params.suburb}`;
    const meta = META[suburb.slug] ?? {
      title: `Delivery in ${suburb.name} | Zwits`,
      description: suburb.blurb,
      h1: `Delivery in ${suburb.name}`,
    };
    return seo({
      title: meta.title,
      description: meta.description,
      path,
      jsonLd: [
        breadcrumbJsonLd(crumbsFor(suburb.name, path)),
        serviceJsonLd({
          name: `Delivery in ${suburb.name}`,
          description: meta.description,
          path,
          areaServed: "Harare",
        }),
        faqJsonLd(suburb.faqs),
      ],
    });
  },
  notFoundComponent: SuburbNotFound,
  component: SuburbDelivery,
});

function crumbsFor(name: string, path: string): Crumb[] {
  return [
    { name: "Home", path: "/" },
    { name: "Delivery", path: "/delivery" },
    { name: "Harare", path: "/delivery/harare" },
    { name, path },
  ];
}

function SuburbNotFound() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">We don't cover that area yet</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Zwits delivery is live across Harare. Check the areas we currently serve.
        </p>
        <Link to="/delivery/harare" className="mt-5 inline-block text-primary underline">
          Delivery in Harare
        </Link>
      </div>
    </SiteShell>
  );
}

function SuburbDelivery() {
  const { suburb } = Route.useLoaderData();
  const path = `/delivery/harare/${suburb.slug}`;
  const meta = META[suburb.slug];

  const nearby = suburb.nearby
    .map((slug) => HARARE_SUBURBS.find((s) => s.slug === slug))
    .filter((s): s is (typeof HARARE_SUBURBS)[number] => Boolean(s));

  return (
    <SiteShell>
      <SeoLanding
        crumbs={crumbsFor(suburb.name, path)}
        eyebrow={`Harare · ${suburb.name}`}
        h1={meta?.h1 ?? `Delivery in ${suburb.name}`}
        intro={suburb.intro}
        primaryCta={{ label: "Send a parcel", to: "/send-delivery" }}
        secondaryCta={{ label: "All Harare delivery", to: "/delivery/harare" }}
        offerTitle={`What people send in ${suburb.name}`}
        offer={suburb.useCases}
        stepsTitle="How a Zwits delivery works"
        steps={[
          { title: "Enter the addresses", text: `Set your ${suburb.name} pickup point and the drop-off anywhere in Harare.` },
          { title: "Confirm the quoted price", text: "You see the trip price, based on distance and vehicle, before the booking is created." },
          { title: "Follow it live", text: "Track the rider on the map and get confirmation at hand-over." },
        ]}
        benefitsTitle="Why Zwits works here"
        benefits={[
          "Verified riders and drivers, identity-checked before their first job.",
          "Price quoted up front — nothing renegotiated at the gate.",
          "Cash on delivery, Zwits wallet or a business account.",
          "One platform for delivery and for booking other services in the same area.",
        ]}
        areasTitle="Nearby areas we also cover"
        areas={nearby.map((s) => ({
          label: `Delivery in ${s.name}`,
          to: `/delivery/harare/${s.slug}`,
          text: s.blurb,
        }))}
        faqs={suburb.faqs}
        relatedTitle="Related pages"
        related={[
          { label: "Delivery across Harare", to: "/delivery/harare" },
          { label: "Delivery pricing", to: "/pricing" },
          { label: "Business delivery accounts", to: "/business" },
          { label: "Book a home or trade service", to: "/services" },
          { label: "Deliver with Zwits", to: "/drivers" },
        ]}
        finalCtaTitle={`Sending something from ${suburb.name}?`}
        finalCtaText="Book online and a nearby rider will be on the way."
      >
        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Delivering in {suburb.name}: what to know
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {suburb.considerations.map((c) => (
              <div key={c.title} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-display text-base font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {suburb.localContext}
          </p>
        </section>

        {suburb.landmarks.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Common reference points</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Useful landmarks to describe a pickup or drop-off in {suburb.name}.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {suburb.landmarks.map((l) => (
                <li key={l} className="rounded-full border border-border px-3.5 py-1.5 text-sm text-muted-foreground">
                  {l}
                </li>
              ))}
            </ul>
          </section>
        )}
      </SeoLanding>
    </SiteShell>
  );
}
