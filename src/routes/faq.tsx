import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/page-hero";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Zwits" },
      { name: "description", content: "Answers to the most common questions about Zwits." },
      { property: "og:url", content: "https://www.zwits.co.zw/faq" },
    ],
    links: [{ rel: "canonical", href: "https://www.zwits.co.zw/faq" }],
  }),
  component: Faq,
});

const faqs = [
  ["How do I book a service?", "Open the Zwits app, pick a category, share your location and confirm. A nearby verified provider accepts your job in seconds."],
  ["Which payment methods are supported?", "We support EcoCash, InnBucks and Visa/Mastercard. Cash is also accepted for some categories."],
  ["How are providers vetted?", "Every provider submits ID, references and proof of skill. We run background checks and require minimum ratings to stay active."],
  ["What does Zwits charge?", "Zwits takes a small commission on each completed job. Customers see the full price upfront — no surprises."],
  ["Do you operate outside Zimbabwe?", "Not yet. We're starting in Harare, Bulawayo and Mutare, with more cities coming soon."],
  ["How do I become a provider?", "Apply via the Become a Provider page. We review applications within 48 hours."],
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <SiteShell>
      <PageHero eyebrow="FAQ" title="Questions, answered.">
        Can't find what you need? Reach out — we usually reply within a few hours.
      </PageHero>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="divide-y divide-border rounded-3xl border border-border bg-card">
          {faqs.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <button
                key={q}
                onClick={() => setOpen(isOpen ? null : i)}
                className="block w-full text-left"
              >
                <div className="flex items-center justify-between gap-4 px-6 py-5">
                  <span className="font-display font-semibold">{q}</span>
                  <ChevronDown className={`size-4 shrink-0 transition ${isOpen ? "rotate-180 text-primary" : "text-muted-foreground"}`} />
                </div>
                {isOpen && <p className="px-6 pb-5 text-sm text-muted-foreground">{a}</p>}
              </button>
            );
          })}
        </div>
      </section>
    </SiteShell>
  );
}
