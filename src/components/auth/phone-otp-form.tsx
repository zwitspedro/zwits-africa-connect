import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Field, SubmitButton } from "@/components/auth/auth-ui";
import { supabase } from "@/integrations/supabase/client";
import { requestPhoneOtp, verifyPhoneOtp } from "@/lib/auth-otp.functions";
import { formatPhoneNumber, toCanonicalPhone } from "@/lib/phone";
import { resolveLanding } from "@/lib/auth-nav";
import type { AppRole } from "@/lib/roles";

const MESSAGES: Record<string, string> = {
  invalid_phone: "Enter a valid Zimbabwean mobile number, e.g. 077 123 4567.",
  cooldown: "Please wait a minute before requesting another code.",
  rate_limited: "Too many codes requested. Try again later.",
  too_many_attempts: "Too many attempts. Request a new code in a few minutes.",
  invalid_code: "That code isn't right. Check it and try again.",
  expired: "That code has expired. Request a new one.",
  no_active_code: "No active code — request a new one.",
  sms_not_configured: "SMS sign-in isn't switched on yet. Please use email or Google for now.",
  gateway_error: "Our SMS provider rejected the message. Please try email sign-in.",
  gateway_unreachable: "We couldn't reach the SMS network. Please try again shortly.",
  server_error: "Something went wrong on our side. Please try again.",
};

/** Mobile number + one-time passcode sign-in / registration. */
export function PhoneOtpForm({ role }: { role: Extract<AppRole, "customer" | "provider"> }) {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!toCanonicalPhone(phone)) return toast.error(MESSAGES["invalid_phone"]!);
    setLoading(true);
    const res = await requestPhoneOtp({ data: { phone } });
    setLoading(false);
    if (!res.ok) return toast.error(MESSAGES[res.error] ?? MESSAGES["server_error"]!);
    setStage("code");
    setCooldown(res.cooldown);
    toast.success(`Code sent to ${formatPhoneNumber(toCanonicalPhone(phone)!)}`);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await verifyPhoneOtp({ data: { phone, code, role } });
    if (!res.ok) {
      setLoading(false);
      return toast.error(MESSAGES[res.error] ?? MESSAGES["server_error"]!);
    }

    const { data, error } = await supabase.auth.verifyOtp({
      type: "email",
      token_hash: res.tokenHash,
    });
    setLoading(false);
    if (error || !data.user) return toast.error("We couldn't start your session. Please try again.");

    toast.success("Signed in");
    navigate({ to: await resolveLanding(data.user.id, role), replace: true });
  };

  if (stage === "phone") {
    return (
      <form className="grid gap-4" onSubmit={send}>
        <Field
          label="Mobile number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="077 123 4567"
          autoComplete="tel"
          inputMode="tel"
          required
        />
        <SubmitButton loading={loading}>Send code</SubmitButton>
      </form>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={verify}>
      <Field
        label="6-digit code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="123456"
        inputMode="numeric"
        autoComplete="one-time-code"
        required
      />
      <SubmitButton loading={loading}>Verify and continue</SubmitButton>
      <div className="flex items-center justify-between text-sm">
        <button type="button" className="text-muted-foreground hover:underline" onClick={() => setStage("phone")}>
          Change number
        </button>
        <button
          type="button"
          disabled={cooldown > 0}
          className="font-medium text-primary hover:underline disabled:opacity-50"
          onClick={() => void send()}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}
