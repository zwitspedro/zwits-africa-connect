import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { PageHero, Prose } from "@/components/page-hero";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Zwits" },
      { name: "description", content: "How Zwits collects, uses and protects your data." },
      { property: "og:url", content: "https://zwits-africa-connect.lovable.app/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://zwits-africa-connect.lovable.app/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <SiteShell>
      <PageHero eyebrow="Legal" title="Privacy Policy" />
      <Prose>
        <p>Last updated: May 2026. This policy explains how Zwits collects and uses information when you use our platform.</p>
        <h2>Information we collect</h2>
        <p>Account details (name, phone, email), location data while you use the app, payment metadata, and job history.</p>
        <h2>How we use it</h2>
        <p>To match you with providers, process payments, keep the platform safe and improve our services.</p>
        <h2>Sharing</h2>
        <p>We share only what's needed to complete a job (e.g. your pickup location with your assigned provider). We never sell your data.</p>
        <h2>Your rights</h2>
        <p>You can request access, correction or deletion of your data at any time by contacting hello@zwits.app.</p>
      </Prose>
    </SiteShell>
  );
}
