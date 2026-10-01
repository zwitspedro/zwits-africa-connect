import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { PageHero, Prose } from "@/components/page-hero";
import { BUSINESS } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Zwits" },
      { name: "description", content: "Terms for using Zwits in Harare, including bookings, cash payments, provider commission, cancellations and disputes." },
      { property: "og:title", content: "Terms of Service — Zwits" },
      { property: "og:description", content: "Terms for using Zwits in Harare, including bookings, cash payments, provider commission, cancellations and disputes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://www.zwits.co.zw/terms" },
    ],
    links: [{ rel: "canonical", href: "https://www.zwits.co.zw/terms" }],
  }),
  component: Terms,
});

function Terms() {
  return (
    <SiteShell>
      <PageHero eyebrow="Legal" title="Terms of Service" />
      <Prose>
        <p>Last updated: 1 October 2026. These terms apply to the Zwits website and apps operated by {BUSINESS.legalName} in Zimbabwe. By creating an account or using Zwits, you agree to these terms. If you do not agree, do not use the platform.</p>

        <h2>1. What Zwits does</h2>
        <p>Zwits connects customers with independent service providers and delivery providers. Currently, live bookings are available in Harare only. Providers perform the work and are responsible for carrying it out safely and lawfully; they are not Zwits employees merely because they use the platform. Zwits facilitates requests, matching, booking updates and support, but does not itself perform the listed jobs. Availability and acceptance are not guaranteed.</p>

        <h2>2. Accounts and eligibility</h2>
        <p>Provide accurate information, keep your account secure and use it only for lawful purposes. You are responsible for activity under your account. Providers must supply truthful identity, qualifications, service-area and payout information, and maintain any licences or permissions required for their work. We may restrict access while reviewing safety, fraud or compliance concerns.</p>

        <h2>3. Requests and bookings</h2>
        <p>Customers should describe the work, addresses and any safety requirements accurately. A request does not guarantee that a provider will accept it. Confirm the agreed scope and price before work begins; changes to the scope or price should be agreed between the customer and provider. Providers should only accept jobs they can complete safely and within their stated service area.</p>

        <h2>4. Prices, cash and commission</h2>
        <p>Cash on completion is the only live payment method. Pay the agreed amount when the job is completed. EcoCash, InnBucks and card payments are coming soon and are not currently available through Zwits. Providers pay Zwits a 10% commission on completed jobs; the applicable job breakdown is displayed in the provider’s earnings view. Do not assume an electronic payment or automatic refund has taken place simply because a booking status changes.</p>

        <h2>5. Cancellations, disputes and refunds</h2>
        <p>Customers and providers may request cancellation where the booking’s current stage permits it; a completed job cannot be cancelled as though it never happened. If a provider cannot finish or there is a disagreement about quality, price or payment, contact Zwits with the booking details. We review disputes individually and may ask both parties for evidence before deciding whether a correction or adjustment is appropriate. Since live payments are made in cash directly at completion, any return of cash must be arranged with the paying and receiving parties; Zwits does not automatically reverse a cash payment. No fixed refund outcome or timing is promised.</p>

        <h2>6. Safety and acceptable use</h2>
        <p>Do not submit false requests, impersonate others, harass people, misuse personal information, or arrange unlawful or unsafe work. Respect the privacy and property of others. Report safety incidents or suspected fraud promptly. We may suspend or remove accounts and bookings when reasonably necessary to protect users or the platform.</p>

        <h2>7. Location and communications</h2>
        <p>Addresses and, while an active job is being tracked, provider or driver location may be shared with the parties involved to coordinate the job. Do not use that information for any other purpose. We may send booking, account and safety notices to the contact details associated with your account. See our <Link to="/privacy" className="text-primary underline">Privacy Policy</Link> for details.</p>

        <h2>8. Responsibility and changes</h2>
        <p>Each party is responsible for its own actions and legal obligations. Zwits cannot guarantee uninterrupted access, a match, an arrival time or the outcome of a service. Nothing in these terms removes rights or remedies that cannot lawfully be excluded. We may update these terms as the service changes; the date above identifies this version. Material changes will be communicated through the platform or your account contact details where appropriate.</p>

        <h2>9. Contact</h2>
        <p>Questions about these terms or a booking? Email <a className="text-primary underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>, call <a className="text-primary underline" href={`tel:${BUSINESS.phone}`}>{BUSINESS.phoneDisplay}</a>, or use our <Link to="/contact" className="text-primary underline">contact page</Link>.</p>
      </Prose>
    </SiteShell>
  );
}
