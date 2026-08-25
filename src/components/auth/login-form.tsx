import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckField,
  Divider,
  Field,
  PasswordField,
  SocialButtons,
  SubmitButton,
} from "@/components/auth/auth-ui";
import {
  REMEMBERED_EMAIL_KEY,
  isPhoneIdentifier,
  normalisePhone,
  resolveLanding,
} from "@/lib/auth-nav";
import type { AppRole } from "@/lib/roles";

/** Shared credential form used by both the customer and provider login pages. */
export function LoginForm({ preferred, registerTo, registerLabel }: {
  preferred: AppRole;
  registerTo: string;
  registerLabel: string;
}) {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (saved) setIdentifier(saved);
  }, []);

  const go = async (userId: string) => {
    const to = await resolveLanding(userId, preferred);
    navigate({ to, replace: true });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const credentials = isPhoneIdentifier(identifier)
      ? { phone: normalisePhone(identifier), password }
      : { email: identifier.trim(), password };
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("not confirmed")) {
        toast.error("Your email isn't confirmed yet — resend the confirmation link.", {
          action: { label: "Resend", onClick: () => navigate({ to: "/resend-confirmation" }) },
        });
        return;
      }
      toast.error(
        msg.includes("invalid")
          ? "Those details don't match an account. Check and try again."
          : error.message,
      );
      return;
    }

    if (remember) localStorage.setItem(REMEMBERED_EMAIL_KEY, identifier.trim());
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY);

    toast.success("Welcome back");
    if (data.user) await go(data.user.id);
  };

  const afterSocial = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) await go(data.user.id);
  };

  if (method === "otp") {
    return (
      <>
        <PhoneOtpForm role={preferred === "provider" ? "provider" : "customer"} />
        <button
          type="button"
          onClick={() => setMethod("password")}
          className="mt-4 w-full text-sm font-medium text-primary hover:underline"
        >
          Use email and password instead
        </button>
        <Divider />
        <SocialButtons onSignedIn={afterSocial} intent={preferred === "provider" ? "provider" : "customer"} />
      </>
    );
  }

  return (
    <>
      <form className="grid gap-4" onSubmit={submit}>
        <Field
          label="Email or phone number"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
          placeholder="you@example.com or +263 77 123 4567"
          required
        />
        <PasswordField label="Password" value={password} onChange={setPassword} required />

        <div className="flex items-center justify-between gap-3">
          <CheckField checked={remember} onChange={setRemember}>
            Remember me
          </CheckField>
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <SubmitButton loading={loading}>Log in</SubmitButton>
      </form>

      <Link
        to={registerTo}
        className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-input bg-background/60 px-6 py-3.5 text-sm font-semibold transition hover:bg-muted"
      >
        {registerLabel}
      </Link>

      <Divider />
      <SocialButtons onSignedIn={afterSocial} />
    </>
  );
}
