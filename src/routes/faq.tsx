import { createFileRoute } from "@tanstack/react-router";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/page-hero";
import { ChevronDown } from "lucide-react";

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
  ["How do I book a service?", "Open the Zwits app, pick a category, share your location and confirm. A nearby verified provider accepts your job in seconds."],
  ["Which payment methods are supported?", "Cash on completion is the only payment method live today. Card and mobile money (EcoCash, InnBucks) are coming soon."],
  ["How are providers vetted?", "Every provider submits ID, references and proof of skill. We run background checks and require minimum ratings to stay active."],
  ["What does Zwits charge?", "Zwits takes a small commission on each completed job. Customers see the full price upfront — no surprises."],
  ["Do you operate outside Zimbabwe?", "Not yet. We're live in Harare, with more Zimbabwean cities to follow."],
  ["How do I become a provider?", "Apply via the Become a Provider page. We review applications within 48 hours."],
];

function Faq() {
  return (
    <SiteShell>
      <PageHero eyebrow="FAQ" title="Questions, answered.">
        Can't find what you need? Reach out — we usually reply within a few hours.
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
