import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { RoleGate } from "@/components/portal/role-gate";
import { Button } from "@/components/ui/button";
import { ProfileSection } from "@/components/provider/profile-section";
import { PayoutSection } from "@/components/provider/payout-section";
import { useProviderData } from "@/components/provider/use-provider-data";

export const Route = createFileRoute("/_authenticated/provider/profile")({
  head: () => ({ meta: [
    { title: "Provider profile & payment details — Zwits" },
    { name: "description", content: "Manage your Zwits provider name, phone, bank details and payment preferences." },
    { property: "og:title", content: "Provider profile & payment details — Zwits" },
    { property: "og:description", content: "Manage your Zwits provider contact and private payment details." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: () => <RoleGate role="provider"><ProviderProfilePage /></RoleGate>,
});

function ProviderProfilePage() {
  const data = useProviderData();
  return <SiteShell><main className="mx-auto max-w-3xl px-4 py-8">
    <Button variant="ghost" asChild><Link to="/provider/dashboard"><ArrowLeft />Dashboard</Link></Button>
    <h1 className="mt-6 font-display text-2xl">Provider profile</h1>
    {data.isLoading || data.profile === undefined || data.onboardingRow === undefined ? (
      <p role="status" className="py-8 text-muted-foreground">Loading profile…</p>
    ) : !data.provider ? (
      <Button asChild className="mt-6"><Link to="/provider/setup">Complete provider setup</Link></Button>
    ) : <>
      <ProfileSection key={`profile-${data.user?.id}`} data={data} />
      <PayoutSection key={`payment-${data.user?.id}`} data={data} />
    </>}
  </main></SiteShell>;
}