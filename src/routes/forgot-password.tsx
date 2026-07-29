import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Field, SubmitButton } from "@/components/auth/auth-ui";
import { supabase } from "@/integrations/supabase/client";

const title = "Reset your password — Zwits";
const description = "Request a secure password reset link for your Zwits account.";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
  };

  return (
    <AuthShell
      variant="customer"
      title="Account recovery"
      subtitle="We'll email you a secure link to set a new password. The link expires shortly for your safety."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to login
        </Link>
      }
    >
      {sent ? (
        <div className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary">
            <MailCheck className="size-6" />
          </div>
          <h2 className="mt-4 font-display text-xl font-semibold">Check your inbox</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            If an account exists for <span className="text-foreground">{email}</span>, a reset link is on its way.
          </p>
        </div>
      ) : (
        <form className="grid gap-4" onSubmit={submit}>
          <Field
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <SubmitButton loading={loading}>Send reset link</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
