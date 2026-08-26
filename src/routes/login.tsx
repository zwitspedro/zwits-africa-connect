import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

const title = "Customer login — Zwits";
const description =
  "Log in to book services, track orders, manage your wallet and connect with trusted professionals on Zwits.";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.zwits.co.zw/login" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.zwits.co.zw/login" }],
  }),
  component: CustomerLogin,
});

function CustomerLogin() {
  return (
    <AuthShell
      variant="customer"
      title="Welcome Back"
      subtitle="Log in to book services, track orders, manage your wallet, and connect with trusted professionals."
      footer={
        <>
          Are you a professional?{" "}
          <Link to="/provider-login" className="font-medium text-primary hover:underline">
            Provider login
          </Link>
        </>
      }
    >
      <LoginForm preferred="customer" registerTo="/signup" registerLabel="Create customer account" />
    </AuthShell>
  );
}
