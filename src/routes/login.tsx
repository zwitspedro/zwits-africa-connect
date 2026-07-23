import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Zwits" },
      { name: "description", content: "Sign in to your Zwits account." },
      { property: "og:url", content: "https://zwits-africa-connect.lovable.app/login" },
    ],
    links: [{ rel: "canonical", href: "https://zwits-africa-connect.lovable.app/login" }],
  }),
  component: Login,
});

type Mode = "email" | "phone";

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/" });
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) return toast.error(error.message);
    setOtpSent(true);
    toast.success("Code sent");
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/" });
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in failed");
  };

  return (
    <SiteShell>
      <section className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-16 sm:px-6">
        <div className="w-full rounded-3xl border border-border bg-card p-8">
          <h1 className="font-display text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to manage your bookings.</p>

          <button onClick={google} className="mt-6 w-full rounded-full border border-input bg-background px-4 py-3 text-sm font-medium hover:bg-muted">
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> OR <span className="h-px flex-1 bg-border" />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-1 rounded-full border border-border p-1 text-xs">
            <button onClick={() => setMode("email")} className={`rounded-full px-3 py-2 ${mode === "email" ? "bg-primary text-primary-foreground" : ""}`}>Email</button>
            <button onClick={() => setMode("phone")} className={`rounded-full px-3 py-2 ${mode === "phone" ? "bg-primary text-primary-foreground" : ""}`}>Phone</button>
          </div>

          {mode === "email" ? (
            <form className="grid gap-4" onSubmit={handleEmail}>
              <Field label="Email" value={email} onChange={setEmail} type="email" required />
              <Field label="Password" value={password} onChange={setPassword} type="password" required />
              <button disabled={loading} className="mt-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          ) : (
            <form className="grid gap-4" onSubmit={otpSent ? verifyOtp : sendOtp}>
              <Field label="Phone (e.g. +263 77 123 4567)" value={phone} onChange={setPhone} type="tel" required />
              {otpSent && <Field label="6-digit code" value={otp} onChange={setOtp} required />}
              <button disabled={loading} className="mt-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {loading ? "Please wait…" : otpSent ? "Verify code" : "Send code"}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            New to Zwits? <Link to="/signup" className="text-primary hover:underline">Create an account</Link>
          </p>
        </div>
      </section>
    </SiteShell>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
