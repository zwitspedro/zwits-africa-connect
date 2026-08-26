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
    const title = `Delivery in ${suburb.name} | Same-Day Courier | Zwits`;
    const description = `Same-day parcel, document and shop-order delivery in ${suburb.name}, Harare. Book a verified Zwits rider or driver online and track the trip to the door.`;
    const crumbs = crumbsFor(suburb.name, path);
    return seo({
      title,
      description,
      path,
      jsonLd: [
        breadcrumbJsonLd(crumbs),
        serviceJsonLd({
          name: `Delivery in ${suburb.name}`,
          description,
          path,
          areaServed: "Harare",
        }),
        faqJsonLd(faqsFor(suburb.name)),
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

function faqsFor(name: string) {
  return [
    {
      q: `How long does a delivery in ${name} take?`,
      a: `Most ${name} trips are same-day. Short runs inside the area are usually collected shortly after a rider accepts, while cross-city trips depend on distance and traffic.`,
    },
    {
      q: `What does delivery in ${name} cost?`,
      a: "Pricing is based on distance and vehicle type and is quoted before you confirm. Express bike trips start from $3 and standard van runs from $12.",
    },
    {
      q: `Can a business in ${name} use Zwits for daily deliveries?`,
      a: "Yes. Zwits Business supports scheduled routes, repeat collections and monthly invoicing instead of paying trip by trip.",
    },
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
  const others = HARARE_SUBURBS.filter((s) => s.slug !== suburb.slug);

  return (
    <SiteShell>
      <SeoLanding
        crumbs={crumbsFor(suburb.name, path)}
        eyebrow={`Harare · ${suburb.name}`}
        h1={`Delivery in ${suburb.name}`}
        intro={suburb.blurb}
        primaryCta={{ label: "Send a parcel", to: "/send-delivery" }}
        secondaryCta={{ label: "All Harare delivery", to: "/delivery/harare" }}
        offerTitle={`What Zwits moves in ${suburb.name}`}
        offer={[
          { title: "Parcels and documents", text: `Collections and drops around ${suburb.name} handled by the nearest available rider.` },
          { title: "Shop and supplier runs", text: "A rider collects your paid order and brings it straight to your door." },
          { title: "Business collections", text: `Recurring pickups for traders and offices based in ${suburb.name}.` },
        ]}
        steps={[
          { title: "Enter the addresses", text: `Set your ${suburb.name} pickup point and the drop-off anywhere in Harare.` },
          { title: "Confirm the quoted price", text: "You see the trip price before the booking is created." },
          { title: "Follow it live", text: "Track the rider on the map and get confirmation at hand-over." },
        ]}
        benefits={[
          "Verified riders and drivers, identity-checked before their first job.",
          "Same-day movement for most bookings in the area.",
          "Price quoted up front — nothing renegotiated at the gate.",
          "Cash on delivery, Zwits wallet or a business account.",
        ]}
        areasTitle="Nearby areas"
        areas={others.map((s) => ({
          label: `Delivery in ${s.name}`,
          to: `/delivery/harare/${s.slug}`,
        }))}
        faqs={faqsFor(suburb.name)}
        related={[
          { label: "Delivery pricing", to: "/pricing" },
          { label: "Business delivery", to: "/business" },
          { label: "Book a service instead", to: "/services" },
          { label: "Contact Zwits", to: "/contact" },
        ]}
        finalCtaTitle={`Sending something from ${suburb.name}?`}
        finalCtaText="Book online and a nearby rider will be on the way."
      >
        {suburb.landmarks.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Common pickup points</h2>
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
