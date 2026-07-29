import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

const title = "Provider login — Zwits for professionals";
const description =
  "Manage bookings, grow your business, receive jobs and increase your earnings with the Zwits provider portal.";

export const Route = createFileRoute("/provider-login")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://zwits.co.zw/provider-login" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://zwits.co.zw/provider-login" }],
  }),
  component: ProviderLogin,
});

function ProviderLogin() {
  return (
    <AuthShell
      variant="provider"
      title="Welcome Back, Professional"
      subtitle="Manage bookings, grow your business, receive jobs, and increase your earnings with Zwits."
      footer={
        <>
          Looking to book a service?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Customer login
          </Link>
        </>
      }
    >
      <LoginForm preferred="provider" registerTo="/provider-signup" registerLabel="Register as a provider" />
    </AuthShell>
  );
}
