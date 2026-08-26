import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { SeoLanding } from "@/components/seo/seo-landing";
import { services } from "@/data/services";
import {
  seo,
  breadcrumbJsonLd,
  faqJsonLd,
  type Crumb,
  type Faq,
} from "@/lib/seo";

const title = "Join Zwits | Become a Service Provider in Zimbabwe";
const description =
  "Join Zwits as a verified service provider in Zimbabwe. Receive job requests in your trade and area, manage bookings in one app and get paid after every completed job.";

const crumbs: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Providers", path: "/providers" },
];

const faqs: Faq[] = [
  {
    q: "Who can join Zwits as a service provider?",
    a: "Tradespeople and service businesses working in Zimbabwe — plumbers, electricians, cleaners, mechanics, gardeners, beauty professionals, solar and borehole technicians and more. You need valid identity documents and the ability to do the work you list.",
  },
  {
    q: "What does it cost to join?",
    a: "Creating a provider account and listing your services is free. Zwits earns a commission on completed jobs booked through the platform.",
  },
  {
    q: "How do I get jobs?",
    a: "When a customer books a service in your category and area, Zwits sends the job to nearby available providers. You accept the ones you want and the customer's details are released for that job only.",
  },
  {
    q: "When do I get paid?",
    a: "Earnings from completed jobs are recorded in your Zwits wallet and paid out to your preferred payout method. Cash jobs are reconciled against your account.",
  },
  {
    q: "What verification is required?",
    a: "Identity verification and profile review before you can accept work. Some categories require additional supporting documents.",
  },
];

export const Route = createFileRoute("/providers")({
  head: () =>
    seo({
      title,
      description,
      path: "/providers",
      jsonLd: [breadcrumbJsonLd(crumbs), faqJsonLd(faqs)],
    }),
  component: ProvidersLanding,
});

function ProvidersLanding() {
  const categories = services.filter((s) => s.popular).slice(0, 8);

  return (
    <SiteShell>
      <SeoLanding
        crumbs={crumbs}
        eyebrow="Service providers"
        h1="Grow your business with Zwits"
        intro="Zwits connects Zimbabwean tradespeople and service businesses with customers who are ready to book. List what you do, receive job requests in your area, and build a reputation that brings more work."
        primaryCta={{ label: "Join Zwits as a provider", to: "/provider-signup" }}
        secondaryCta={{ label: "Provider hub", to: "/provider" }}
        offerTitle="What you get as a Zwits provider"
        offer={[
          { title: "Customer opportunities", text: "Job requests in your trade and your service area, sent straight to your phone." },
          { title: "A public profile", text: "Show your services, your area and your completed work to customers browsing Zwits." },
          { title: "Reputation that compounds", text: "Genuine ratings from completed jobs unlock more visibility and more requests." },
          { title: "Booking management", text: "Accept, schedule and complete jobs in one dashboard instead of scattered WhatsApp threads." },
          { title: "Earnings and payouts", text: "Track earnings per job in your Zwits wallet and withdraw to your payout method." },
          { title: "You control availability", text: "Go online when you're ready to work and offline when you're not." },
        ]}
        steps={[
          { title: "Create your provider account", text: "Register with your trade, service area and contact details." },
          { title: "Get verified", text: "Submit your identity documents for review before your first job." },
          { title: "Start receiving jobs", text: "Go online, accept requests that suit you and get paid on completion." },
        ]}
        benefits={[
          "No cost to list your services — you earn on the jobs you complete.",
          "Work in the categories and suburbs you choose.",
          "Customer requests are matched to nearby, available providers.",
          "Every job is recorded, so disputes are handled with evidence.",
          "Support from a Zimbabwean team, reachable on WhatsApp.",
        ]}
        areasTitle="Popular categories on Zwits"
        areas={categories.map((s) => ({
          label: s.name,
          to: `/services/${s.slug}`,
          text: s.description,
        }))}
        trust="Zwits verifies every provider before they can accept work. Your documents stay private — customers only ever see your business profile, services and ratings."
        faqs={faqs}
        related={[
          { label: "Browse all services", to: "/services" },
          { label: "Deliver with Zwits", to: "/drivers" },
          { label: "Business partnerships", to: "/business" },
          { label: "Provider login", to: "/provider-login" },
          { label: "Contact Zwits", to: "/contact" },
        ]}
        finalCtaTitle="Ready to receive your first job?"
        finalCtaText="Registration takes a few minutes and costs nothing."
      />
    </SiteShell>
  );
}
