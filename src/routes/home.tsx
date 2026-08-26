import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { Hero } from "@/components/marketing/hero";
import { LiveStats } from "@/components/marketing/live-stats";
import { JourneySplit } from "@/components/marketing/journey-split";
import { ServiceCategories } from "@/components/marketing/service-categories";
import { FeaturedProviders } from "@/components/marketing/featured-providers";
import { WhyZwits } from "@/components/marketing/why-zwits";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { BusinessSolutions } from "@/components/marketing/business-solutions";
import { PartnerRecruitment } from "@/components/marketing/partner-recruitment";
import { AppPreview } from "@/components/marketing/app-preview";
import { Testimonials } from "@/components/marketing/testimonials";
import { EcosystemRoadmap } from "@/components/marketing/ecosystem-roadmap";
import { FaqSection } from "@/components/marketing/faq-section";
import { FinalCta } from "@/components/marketing/final-cta";

const title = "Zwits — One Platform. Every Service. Endless Possibilities.";
const description =
  "Zwits is Zimbabwe's digital services ecosystem, connecting customers, businesses, delivery partners and skilled professionals through one trusted platform.";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.zwits.co.zw/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    // "/" is the canonical Zwits homepage; /home is the long marketing view of
    // the same intent and must not compete with it in search.
    links: [{ rel: "canonical", href: "https://www.zwits.co.zw/" }],
  }),
  component: Home,
});

function Home() {
  return (
    <SiteShell>
      <Hero />
      <JourneySplit />
      <LiveStats />
      <ServiceCategories />
      <FeaturedProviders />
      <WhyZwits />
      <HowItWorks />
      <BusinessSolutions />
      <PartnerRecruitment />
      <AppPreview />
      <Testimonials />
      <EcosystemRoadmap />
      <FaqSection />
      <FinalCta />
    </SiteShell>
  );
}
