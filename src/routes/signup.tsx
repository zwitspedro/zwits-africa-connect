import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  CheckField,
  Divider,
  Field,
  PasswordField,
  SocialButtons,
  SubmitButton,
} from "@/components/auth/auth-ui";
import { supabase } from "@/integrations/supabase/client";
import { resolveLanding } from "@/lib/auth-nav";

const title = "Create your Zwits account — book trusted services";
const description =
  "Join Zwits to book verified professionals, track jobs live and pay securely from one account.";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://zwits.co.zw/signup" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://zwits.co.zw/signup" }],
  }),
  component: CustomerSignup,
});

function CustomerSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    password: "",
    confirm: "",
    referral: "",
  });
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (form.password !== form.confirm) return toast.error("Passwords don't match.");
    if (!terms) return toast.error("Please accept the terms to continue.");

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: form.fullName.trim(), phone: form.phone.trim() },
      },
    });

    if (error) {
      setLoading(false);
      const msg = error.message.toLowerCase();
      toast.error(
        msg.includes("already registered") || msg.includes("already exists")
          ? "This email is already registered. Please sign in using your existing method."
          : msg.includes("rate") || msg.includes("security purposes")
            ? "Too many attempts. Please wait a minute and try again."
            : error.message,
      );
      return;
    }

    // Supabase returns a user with no identities when the address already
    // exists — never silently create or imply a second account.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setLoading(false);
      toast.error("This email is already registered. Please sign in using your existing method.");
      navigate({ to: "/login" });
      return;
    }

    if (data.session && data.user) {
      await claimRole({
        data: { role: "customer", displayName: form.fullName.trim(), phone: form.phone.trim() },
      });
      await supabase
        .from("profiles")
        .update({
          display_name: form.fullName.trim(),
          phone: form.phone.trim() || null,
          city: form.city.trim() || null,
          country: "Zimbabwe",
          referral_code: form.referral.trim() || null,
          terms_accepted_at: new Date().toISOString(),
        })
        .eq("user_id", data.user.id);

      const to = await resolveLanding(data.user.id, "customer");
      setLoading(false);
      toast.success("Account created — welcome to Zwits");
      navigate({ to, replace: true });
      return;
    }

    setLoading(false);
    toast.success("Check your email to confirm your account.");
  };

  const afterSocial = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) navigate({ to: await resolveLanding(data.user.id, "customer"), replace: true });
  };

  return (
    <AuthShell
      variant="customer"
      title="Join Zwits Today"
      subtitle="Create your free account and start booking trusted service providers near you."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Full name" value={form.fullName} onChange={set("fullName")} required autoComplete="name" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" type="email" value={form.email} onChange={set("email")} required autoComplete="email" />
          <Field
            label="Phone number"
            value={form.phone}
            onChange={set("phone")}
            placeholder="+263 77 123 4567"
            autoComplete="tel"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" value={form.city} onChange={set("city")} placeholder="Harare" />
          <Field label="Referral code (optional)" value={form.referral} onChange={set("referral")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField
            label="Password"
            value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            autoComplete="new-password"
            hint="At least 8 characters"
            required
          />
          <PasswordField
            label="Confirm password"
            value={form.confirm}
            onChange={(v) => setForm((f) => ({ ...f, confirm: v }))}
            autoComplete="new-password"
            required
          />
        </div>

        <CheckField checked={terms} onChange={setTerms}>
          I agree to the{" "}
          <Link to="/terms" className="text-primary hover:underline">
            terms of service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            privacy policy
          </Link>
          .
        </CheckField>

        <SubmitButton loading={loading}>Create account</SubmitButton>
      </form>

      <Divider />
      <SocialButtons onSignedIn={afterSocial} />
    </AuthShell>
  );
}
