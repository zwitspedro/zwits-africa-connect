import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { SeoLanding } from "@/components/seo/seo-landing";
import { HARARE_SUBURBS } from "@/data/locations";
import {
  seo,
  breadcrumbJsonLd,
  faqJsonLd,
  serviceJsonLd,
  type Crumb,
  type Faq,
} from "@/lib/seo";

const title = "Delivery Services in Zimbabwe | Courier & Parcels | Zwits";
const description =
  "Send parcels, documents and shop orders with Zwits. Tracked personal and business delivery in Harare, matched to a verified rider or driver.";

const crumbs: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Delivery", path: "/delivery" },
];

const faqs: Faq[] = [
  {
    q: "Which areas does Zwits deliver in?",
    a: "Zwits delivery currently operates across Harare, including the CBD, Avondale, Borrowdale and Marlborough. Other Zimbabwean cities are on our roadmap and are not yet live.",
  },
  {
    q: "How fast is a Zwits delivery?",
    a: "Most Harare deliveries are same-day. Bikes handle documents and small parcels; vans handle boxes, groceries and bulk shop orders. Timing depends on distance, traffic and rider availability at the time you book.",
  },
  {
    q: "How much does delivery cost?",
    a: "Pricing is distance and vehicle based, and you see the price before you confirm. Indicative rates start from $3 for an express bike trip and $12 for a standard van run. See the pricing page for the full breakdown.",
  },
  {
    q: "Can I track my parcel?",
    a: "Yes. Once a driver accepts the job you can follow the route live in the app and receive proof of delivery when it arrives.",
  },
  {
    q: "How do I pay?",
    a: "You can pay cash on delivery or from your Zwits wallet. Business accounts can arrange consolidated monthly invoicing.",
  },
  {
    q: "Can my business outsource deliveries to Zwits?",
    a: "Yes. Restaurants, retailers and online businesses can run scheduled daily routes, bulk drops and invoiced accounts through Zwits Business.",
  },
];

export const Route = createFileRoute("/delivery/")({
  head: () =>
    seo({
      title,
      description,
      path: "/delivery",
      jsonLd: [
        breadcrumbJsonLd(crumbs),
        serviceJsonLd({
          name: "Courier and parcel delivery",
          description,
          path: "/delivery",
          areaServed: "Harare",
        }),
        faqJsonLd(faqs),
      ],
    }),
  component: DeliveryHub,
});

function DeliveryHub() {
  return (
    <SiteShell>
      <SeoLanding
        crumbs={crumbs}
        eyebrow="Zwits Delivery"
        h1="Delivery services across Harare, built for people and businesses"
        intro="Zwits moves parcels, documents, food and shop orders between suburbs the same day. Book online, watch the trip live, and pay cash on delivery or from your Zwits wallet."
        primaryCta={{ label: "Send a parcel", to: "/send-delivery" }}
        secondaryCta={{ label: "Delivery in Harare", to: "/delivery/harare" }}
        offerTitle="Ways to move something with Zwits"
        offer={[
          { title: "Express bike", text: "Documents and parcels under 10kg, picked up within about 20 minutes. From $3." },
          { title: "Standard van", text: "Boxes, groceries and bulk shop orders across the city. From $12." },
          { title: "Business courier", text: "Scheduled daily runs, bulk drops and monthly invoicing for trading businesses." },
          { title: "Personal deliveries", text: "Send something to family, a client or a friend without leaving work." },
          { title: "Shop and collect", text: "A rider collects your paid order from a supplier, pharmacy or shop and brings it to you." },
          { title: "Proof of delivery", text: "Every completed trip is closed out with confirmation from the recipient." },
        ]}
        steps={[
          { title: "Set pickup and drop-off", text: "Enter both addresses and Zwits prices the trip instantly before you commit." },
          { title: "Matched in seconds", text: "The nearest verified rider or driver accepts and heads to your pickup point." },
          { title: "Tracked to the door", text: "Follow the route live and get confirmation the moment the parcel is handed over." },
        ]}
        benefits={[
          "Identity-checked riders and drivers, not anonymous strangers.",
          "Prices shown before you confirm — no negotiating at the gate.",
          "Cash on delivery, Zwits wallet or an invoiced business account.",
          "Live tracking so you know exactly where your parcel is.",
          "One platform for delivery and for every other service you book.",
          "Zimbabwean company, Zimbabwean support, reachable on WhatsApp.",
        ]}
        areasTitle="Harare delivery areas"
        areas={[
          { label: "Delivery in Harare", to: "/delivery/harare", text: "City-wide coverage, pricing and how booking works." },
          ...HARARE_SUBURBS.map((s) => ({
            label: `Delivery in ${s.name}`,
            to: `/delivery/harare/${s.slug}`,
            text: s.blurb,
          })),
        ]}
        faqs={faqs}
        relatedTitle="Explore more"
        related={[
          { label: "Business delivery solutions", to: "/business" },
          { label: "Delivery and service pricing", to: "/pricing" },
          { label: "All Zwits services", to: "/services" },
          { label: "Drive with Zwits", to: "/drivers" },
          { label: "Talk to the Zwits team", to: "/contact" },
        ]}
        finalCtaTitle="Ready to send something?"
        finalCtaText="Create an account and book your first delivery in under a minute."
      >
        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Delivery for businesses</h2>
          <p className="mt-4 text-sm text-muted-foreground sm:text-base">
            Restaurants, retailers and online sellers use Zwits instead of hiring and managing their
            own riders. You get a delivery capacity that scales with your order volume, a live view
            of every trip, and one monthly statement instead of daily cash handling.{" "}
            <Link to="/business" className="text-primary underline">
              See Zwits business delivery solutions
            </Link>
            .
          </p>
        </section>
      </SeoLanding>
    </SiteShell>
  );
}
