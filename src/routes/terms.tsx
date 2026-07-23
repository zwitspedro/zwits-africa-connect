import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { PageHero, Prose } from "@/components/page-hero";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Zwits" },
      { name: "description", content: "The terms that govern your use of Zwits." },
      { property: "og:url", content: "https://zwits-africa-connect.lovable.app/terms" },
    ],
    links: [{ rel: "canonical", href: "https://zwits-africa-connect.lovable.app/terms" }],
  }),
  component: Terms,
});

function Terms() {
  return (
    <SiteShell>
      <PageHero eyebrow="Legal" title="Terms of Service" />
      <Prose>
        <p>By using Zwits you agree to these terms. Please read them carefully.</p>
        <h2>The service</h2>
        <p>Zwits is a marketplace that connects customers with independent service providers. We are not the provider of the services listed.</p>
        <h2>Payments & commission</h2>
        <p>Zwits charges a per-job commission. All applicable taxes and fees are shown before you confirm a booking.</p>
        <h2>Conduct</h2>
        <p>Customers and providers must treat each other with respect. Fraud, harassment or unsafe behavior will result in removal from the platform.</p>
        <h2>Liability</h2>
        <p>Zwits provides the platform "as is" and is not liable for the quality of individual services, though we work hard to keep standards high.</p>
      </Prose>
    </SiteShell>
  );
}
