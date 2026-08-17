import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/auth-shell";
import { Field, SubmitButton } from "@/components/auth/auth-ui";
import { supabase } from "@/integrations/supabase/client";

const title = "Resend your Zwits confirmation email";
const description =
  "Didn't receive your Zwits confirmation email? Enter your address to have the verification link sent again.";

export const Route = createFileRoute("/resend-confirmation")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResendConfirmation,
});

const COOLDOWN_SECONDS = 60;
const LAST_SENT_KEY = "zwits.lastConfirmationResend";

function ResendConfirmation() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const last = Number(localStorage.getItem(LAST_SENT_KEY) ?? 0);
    const left = Math.ceil((last + COOLDOWN_SECONDS * 1000 - Date.now()) / 1000);
    if (left > 0) setCooldown(left);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;
    setLoading(true);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/provider/dashboard` },
    });
    setLoading(false);

    if (error) {
      // Never pretend a failed send succeeded — surface the real reason.
      const msg = error.message.toLowerCase();
      toast.error(
        msg.includes("rate") || msg.includes("security purposes")
          ? "Too many attempts. Please wait a minute and try again."
          : msg.includes("already confirmed")
            ? "This email is already confirmed — you can log in now."
            : `We couldn't send the email: ${error.message}`,
      );
      return;
    }

    localStorage.setItem(LAST_SENT_KEY, String(Date.now()));
    setCooldown(COOLDOWN_SECONDS);
    setSent(true);
    toast.success("Confirmation email sent. Please check your inbox and spam folder.");
  };

  return (
    <AuthShell
      variant="provider"
      title="Resend confirmation email"
      subtitle="Enter the email address you registered with and we'll send the confirmation link again."
      footer={
        <>
          Already confirmed?{" "}
          <Link to="/provider-login" className="font-medium text-primary hover:underline">
            Provider login
          </Link>
        </>
      }
    >
      <form className="grid gap-4" onSubmit={submit}>
        <Field
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
        <SubmitButton loading={loading} disabled={cooldown > 0}>
          {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend confirmation email"}
        </SubmitButton>
      </form>

      {sent && (
        <p className="mt-4 rounded-2xl bg-primary/10 p-4 text-sm text-primary">
          Confirmation email sent. Please check your inbox and spam folder.
        </p>
      )}
    </AuthShell>
  );
}
