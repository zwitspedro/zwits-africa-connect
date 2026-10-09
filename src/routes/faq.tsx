import { createFileRoute } from "@tanstack/react-router";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/page-hero";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Zwits" }, {"property": "og:title", "content": "FAQ — Zwits"}, {"property": "og:description", "content": "Answers to the most common questions about Zwits."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"},
      { name: "description", content: "Answers to the most common questions about Zwits." },
      { property: "og:url", content: "https://www.zwits.co.zw/faq" },
    ],
    links: [{ rel: "canonical", href: "https://www.zwits.co.zw/faq" }],
  }),
  component: Faq,
});

const faqs = [
  ["How do I book a service?", "Choose a service, add your address and preferred time, then confirm your request. Availability depends on providers in your area."],
  ["Which payment methods are supported?", "Cash on completion is the only payment method live today. Card and mobile money (EcoCash, InnBucks) are coming soon."],
  ["How are providers vetted?", "Providers submit identity and verification documents for review before approval."],
  ["What does Zwits charge?", "Zwits charges providers 10% commission on completed jobs. Review your booking details before confirming."],
  ["Do you operate outside Zimbabwe?", "Not yet. We're live in Harare, with more Zimbabwean cities to follow."],
  ["How do I become a provider?", "Apply via the provider page, complete your profile and submit verification documents for review."],
];

function Faq() {
  return (
    <SiteShell>
      <PageHero eyebrow="FAQ" title="Questions, answered.">
        Can't find what you need? Contact Zwits support.
      </PageHero>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Accordion type="single" collapsible defaultValue="faq-0">
          {faqs.map(([q, a], i) => <AccordionItem value={`faq-${i}`} key={q}>
            <AccordionTrigger className="min-h-14 gap-4 font-sans font-bold">{q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
          </AccordionItem>)}
        </Accordion>
      </section>
    </SiteShell>
  );
}
