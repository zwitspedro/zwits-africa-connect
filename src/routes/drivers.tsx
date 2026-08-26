import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { SeoLanding } from "@/components/seo/seo-landing";
import {
  seo,
  breadcrumbJsonLd,
  faqJsonLd,
  type Crumb,
  type Faq,
} from "@/lib/seo";

const title = "Delivery Driver & Rider Opportunities in Zimbabwe | Zwits";
const description =
  "Deliver with Zwits in Harare. Use your motorbike, car or van to accept delivery jobs, work the hours you choose and get paid for every completed trip.";

const crumbs: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Drivers", path: "/drivers" },
];

const faqs: Faq[] = [
  {
    q: "Is this a job with Zwits?",
    a: "No. Zwits delivery partners are independent operators who accept delivery jobs through the platform. You are not employed by Zwits and there is no guaranteed income or fixed shift.",
  },
  {
    q: "What do I need to start?",
    a: "A valid Zimbabwean driver's licence, your own motorbike, car or van, valid identity documents and a smartphone. Your vehicle and documents are reviewed before your first delivery.",
  },
  {
    q: "Where can I deliver?",
    a: "Zwits delivery currently operates in Harare. Other cities will open as the network grows.",
  },
  {
    q: "How and when am I paid?",
    a: "Earnings for completed deliveries are recorded in your Zwits wallet and withdrawn to your payout method. Cash collected on delivery is reconciled against your account.",
  },
  {
    q: "Do I choose my own hours?",
    a: "Yes. You go online when you want work and offline when you don't. You also choose which offers to accept.",
  },
];

export const Route = createFileRoute("/drivers")({
  head: () =>
    seo({
      title,
      description,
      path: "/drivers",
      jsonLd: [breadcrumbJsonLd(crumbs), faqJsonLd(faqs)],
    }),
  component: DriversLanding,
});

function DriversLanding() {
  return (
    <SiteShell>
      <SeoLanding
        crumbs={crumbs}
        eyebrow="Delivery partners"
        h1="Deliver with Zwits"
        intro="If you have a motorbike, car or van in Harare, Zwits sends delivery jobs to your phone. Accept the trips that suit you, complete them, and your earnings land in your Zwits wallet."
        primaryCta={{ label: "Become a Zwits delivery partner", to: "/become-a-driver" }}
        secondaryCta={{ label: "How Zwits delivery works", to: "/delivery" }}
        offerTitle="What delivering with Zwits looks like"
        offer={[
          { title: "Jobs sent to you", text: "Delivery offers are dispatched to nearby online partners — no hunting for work." },
          { title: "You accept or skip", text: "Every offer shows the pickup, drop-off and payout before you decide." },
          { title: "Turn-by-turn routing", text: "Navigation and live tracking are built into the driver app." },
          { title: "Earnings per trip", text: "Every completed delivery is recorded with its payout in your wallet." },
          { title: "Flexible hours", text: "Go online in the morning peak, at lunch, after hours — your call." },
          { title: "Support when it goes wrong", text: "Reach the Zwits team when a pickup, address or recipient is a problem." },
        ]}
        steps={[
          { title: "Register as a delivery partner", text: "Tell us about you and your vehicle and upload your documents." },
          { title: "Get verified", text: "Zwits reviews your licence, identity and vehicle details before activation." },
          { title: "Go online and deliver", text: "Accept offers, complete deliveries and withdraw your earnings." },
        ]}
        benefits={[
          "Work the hours that fit around your other commitments.",
          "Transparent payout shown on every offer before you accept.",
          "Delivery volume across personal and business customers.",
          "Ratings from completed trips improve the offers you receive.",
          "A Zimbabwean platform with local support.",
        ]}
        trust="Zwits verifies every delivery partner's identity, licence and vehicle before activation. Customer details are only released for the delivery you are actively handling."
        faqs={faqs}
        related={[
          { label: "Zwits delivery services", to: "/delivery" },
          { label: "Delivery in Harare", to: "/delivery/harare" },
          { label: "Join as a service provider", to: "/providers" },
          { label: "Careers at Zwits", to: "/careers" },
          { label: "Contact Zwits", to: "/contact" },
        ]}
        finalCtaTitle="Start delivering in Harare"
        finalCtaText="Registration is free. Verification is required before your first trip."
      />
    </SiteShell>
  );
}
