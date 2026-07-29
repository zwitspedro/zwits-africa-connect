import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "./reveal";

const faqs = [
  {
    q: "What exactly is Zwits?",
    a: "Zwits is a digital services ecosystem. One account gives you deliveries, transport, home repairs, cleaning, beauty, freelance talent, business logistics and emergency help — all matched, tracked and paid for in one platform.",
  },
  {
    q: "How are providers vetted?",
    a: "Every provider completes identity verification, a selfie match and business document review before approval. Each upload is logged with a full audit trail, and ongoing ratings determine who keeps receiving work.",
  },
  {
    q: "Which payment methods do you support?",
    a: "Cash is live today. Card (Visa / Mastercard) and mobile money — EcoCash, InnBucks and OneMoney — are being certified and will switch on inside the same checkout.",
  },
  {
    q: "Can businesses open an account?",
    a: "Yes. Zwits Business supports bulk and scheduled logistics, employee management, consolidated monthly invoicing, analytics and API integrations for enterprise clients.",
  },
  {
    q: "Where is Zwits available?",
    a: "We operate in Harare, Bulawayo and Mutare today, with a rollout plan across Zimbabwe and then into the wider Southern African region.",
  },
  {
    q: "How much do providers earn?",
    a: "Providers keep the majority of every job — Zwits takes a small per-category commission, reconciled and paid directly into their mobile wallet.",
  },
];

export function FaqSection() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 md:py-32">
      <div className="grid gap-12 md:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <p className="text-[12px] uppercase tracking-[0.22em] text-gold">FAQ</p>
          <h2 className="mt-4 text-balance-tight font-display text-4xl font-bold tracking-[-0.03em] md:text-5xl">
            Questions, answered.
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`} className="border-border/60">
                <AccordionTrigger className="py-6 text-left font-display text-base font-semibold hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-[15px] leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
