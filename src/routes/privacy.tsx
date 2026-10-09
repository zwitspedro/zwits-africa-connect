import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { PageHero, Prose } from "@/components/page-hero";
import { BUSINESS } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Zwits" },
      { name: "description", content: "How Zwits handles account, booking and location data, including sharing, retention and requests to access or delete your information." },
      { property: "og:title", content: "Privacy Policy — Zwits" },
      { property: "og:description", content: "How Zwits handles account, booking and location data, including sharing, retention and requests to access or delete your information." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://www.zwits.co.zw/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://www.zwits.co.zw/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <SiteShell>
      <PageHero eyebrow="Legal" title="Privacy Policy" />
      <Prose>
        <p>Last updated: 1 October 2026. {BUSINESS.legalName} operates Zwits. This policy explains how we handle personal information when you visit our site, create an account or use our services in Harare.</p>

        <h2>1. Information we collect</h2>
        <ul>
          <li><strong>Account and contact information:</strong> name, email, phone number if supplied, sign-in details and your messages to support.</li>
          <li><strong>Booking information:</strong> service requests, pickup and drop-off or job addresses, instructions, quotations, status updates, ratings, disputes and cash-payment or earnings records associated with a job.</li>
          <li><strong>Provider information:</strong> work categories, service areas, identity and verification documents, availability and payout details supplied during onboarding.</li>
          <li><strong>Technical information:</strong> basic device, browser and usage information needed to run, secure and troubleshoot the site and apps.</li>
        </ul>

        <h2>2. Location information</h2>
        <p>We use the addresses you provide to find nearby providers, arrange jobs and display routes. If you give your device permission, the app can access your location for maps and active-job tracking. During an active booking, a provider or driver’s location may be recorded and shown to the customer assigned to that job. You can withdraw device location permission in your device settings, but live tracking and location-dependent features may then stop working. Location access is not required merely to read the website.</p>

        <h2>3. How we use information</h2>
        <p>We use this information to create and secure accounts, match and coordinate jobs, show booking progress, record cash settlement and provider earnings, review verification documents, respond to support requests and disputes, prevent misuse and meet legal obligations. We do not treat coming-soon electronic payment options as active payment methods.</p>

        <h2>4. Who receives information</h2>
        <p>We share relevant job and contact details with the customer and assigned provider or driver so they can carry out the booking. Our hosting, authentication, mapping and communications providers may process information to operate the platform. We may disclose information where legally required or necessary to address fraud or safety. We do not sell personal information. Other users should use details received through Zwits only for the booking.</p>

        <h2>5. Storage and retention</h2>
        <p>We use access controls to limit who can see personal information and take reasonable steps to protect it. No internet service can promise absolute security. We keep information while needed for your account, bookings, support, dispute resolution, security and applicable legal or accounting requirements. Some records may need to be retained after an account is closed; we will not promise immediate removal where retention is required.</p>

        <h2>6. Your choices and requests</h2>
        <p>You can ask us to access, correct or delete personal information, or request that we close your account, by emailing <a className="text-primary-text underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or using our <Link to="/contact" className="text-primary-text underline">contact page</Link>. We may need to verify your identity before acting and may retain information where law, safety or unresolved transactions require it. You can also change location permissions in your device settings.</p>

        <h2>7. Updates and contact</h2>
        <p>We may revise this policy as the service changes. The date above identifies the current version. For privacy questions, contact <a className="text-primary-text underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call <a className="text-primary-text underline" href={`tel:${BUSINESS.phone}`}>{BUSINESS.phoneDisplay}</a>. See also our <Link to="/terms" className="text-primary-text underline">Terms of Service</Link>.</p>
      </Prose>
    </SiteShell>
  );
}
