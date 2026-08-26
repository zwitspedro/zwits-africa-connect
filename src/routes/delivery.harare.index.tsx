import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { SeoLanding } from "@/components/seo/seo-landing";
import { HARARE_SUBURBS } from "@/data/locations";
import {
  seo,
  breadcrumbJsonLd,
  faqJsonLd,
  localBusinessJsonLd,
  serviceJsonLd,
  type Crumb,
  type Faq,
} from "@/lib/seo";

const title = "Delivery Services in Harare | Same-Day Courier | Zwits";
const description =
  "Reliable same-day delivery in Harare. Send parcels, documents and shop orders between suburbs with tracked Zwits riders and drivers, or set up a business courier account.";

const crumbs: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Delivery", path: "/delivery" },
  { name: "Harare", path: "/delivery/harare" },
];

const faqs: Faq[] = [
  {
    q: "Do you deliver across all of Harare?",
    a: "We cover the city broadly, with the strongest rider density in the CBD, Avondale, Borrowdale and Marlborough. If a pickup falls outside current coverage the app tells you before you pay.",
  },
  {
    q: "Is same-day delivery available in Harare?",
    a: "Yes. Most Harare trips are completed the same day, and short CBD document runs are usually collected within about 20 minutes of a rider accepting.",
  },
  {
    q: "What can I send?",
    a: "Documents, parcels, food, groceries, retail orders and small business stock. We do not carry illegal goods, cash, or anything a rider cannot safely transport.",
  },
  {
    q: "How do businesses in Harare partner with Zwits?",
    a: "Through Zwits Business: scheduled daily runs, bulk drops, multiple pickup points and consolidated monthly invoicing instead of paying trip by trip.",
  },
  {
    q: "How is the price calculated?",
    a: "By distance and vehicle type, quoted up front before you confirm the booking.",
  },
];

export const Route = createFileRoute("/delivery/harare/")({
  head: () =>
    seo({
      title,
      description,
      path: "/delivery/harare",
      jsonLd: [
        breadcrumbJsonLd(crumbs),
        localBusinessJsonLd(),
        serviceJsonLd({
          name: "Delivery services in Harare",
          description,
          path: "/delivery/harare",
          areaServed: "Harare",
        }),
        faqJsonLd(faqs),
      ],
    }),
  component: HarareDelivery,
});

function HarareDelivery() {
  return (
    <SiteShell>
      <SeoLanding
        crumbs={crumbs}
        eyebrow="Harare"
        h1="Reliable delivery services in Harare"
        intro="Zwits is a Harare-based delivery network. Riders and drivers move parcels, documents and orders between suburbs the same day, with the price agreed before pickup and the trip tracked to the door."
        primaryCta={{ label: "Send a parcel in Harare", to: "/send-delivery" }}
        secondaryCta={{ label: "Business delivery", to: "/business" }}
        offerTitle="What we move around Harare"
        offer={[
          { title: "Local parcel delivery", text: "Suburb-to-suburb parcels handled by a rider matched to your pickup point." },
          { title: "Document runs", text: "Contracts, tenders and bank paperwork moved across the CBD without leaving the office." },
          { title: "Shop and retail orders", text: "Customer orders delivered for retailers, pharmacies and restaurants." },
          { title: "Business courier routes", text: "Recurring daily collections and drops for trading businesses." },
          { title: "Bulk van runs", text: "Boxes, stock and bulk groceries where a bike is not enough." },
          { title: "Proof of delivery", text: "Confirmation captured at hand-over so nothing is disputed later." },
        ]}
        steps={[
          { title: "Enter pickup and drop-off", text: "Both Harare addresses, plus what is being sent and how big it is." },
          { title: "Accept the quoted price", text: "Zwits prices the trip on distance and vehicle before you commit." },
          { title: "Track it to the door", text: "The nearest available driver accepts, collects and delivers, live on the map." },
        ]}
        benefits={[
          "A Harare company operating from Marlborough, not a foreign call centre.",
          "Verified riders and drivers, checked before they can accept work.",
          "Same-day movement across the city for most bookings.",
          "Cash on delivery, wallet payment or invoiced business accounts.",
          "One platform for delivery and for booking any other service.",
        ]}
        areasTitle="Harare suburbs we serve"
        areas={HARARE_SUBURBS.map((s) => ({
          label: `Delivery in ${s.name}`,
          to: `/delivery/harare/${s.slug}`,
          text: s.blurb,
        }))}
        faqs={faqs}
        related={[
          { label: "All delivery options", to: "/delivery" },
          { label: "Business delivery partner", to: "/business" },
          { label: "Delivery pricing", to: "/pricing" },
          { label: "Delivery driver opportunities", to: "/drivers" },
          { label: "Contact Zwits", to: "/contact" },
        ]}
        finalCtaTitle="Need something moved in Harare today?"
        finalCtaText="Book in under a minute and follow your parcel across the city."
      />
    </SiteShell>
  );
}
