import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — Zwits" },
      { name: "description", content: "Create your Zwits account." },
      { property: "og:url", content: "https://zwits-africa-connect.lovable.app/signup" },
    ],
    links: [{ rel: "canonical", href: "https://zwits-africa-connect.lovable.app/signup" }],
  }),
  component: Signup,
});

type Mode = "email" | "phone";

function Signup() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);


  const signupEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
  };


  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { data: { display_name: name } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setOtpSent(true);
    toast.success("Code sent to your phone");
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome to Zwits");
    navigate({ to: "/" });
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in failed");
  };

  if (sent) {
    return (
      <SiteShell>
        <section className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-16 sm:px-6">
          <div className="w-full rounded-3xl border border-border bg-card p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-2xl">✉️</div>
            <h1 className="mt-4 font-display text-2xl font-bold">Check your inbox</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>. Click it to
              activate your account, then sign in.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Nothing after a few minutes? Check spam, or sign up again with a different address.
            </p>
            <Link to="/login" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
              Go to sign in
            </Link>
          </div>
        </section>
      </SiteShell>
    );
  }

  return (

    <SiteShell>
      <section className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-16 sm:px-6">
        <div className="w-full rounded-3xl border border-border bg-card p-8">
          <h1 className="font-display text-3xl font-bold">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Book your first service in seconds.</p>

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
            <form className="grid gap-4" onSubmit={signupEmail}>
              <Field label="Full name" value={name} onChange={setName} required />
              <Field label="Email" value={email} onChange={setEmail} type="email" required />
              <Field label="Password (min 6 chars)" value={password} onChange={setPassword} type="password" required />
              <button disabled={loading} className="mt-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {loading ? "Creating…" : "Create account"}
              </button>
            </form>
          ) : (
            <form className="grid gap-4" onSubmit={otpSent ? verifyOtp : sendOtp}>
              {!otpSent && <Field label="Full name" value={name} onChange={setName} required />}
              <Field label="Phone (e.g. +263 77 123 4567)" value={phone} onChange={setPhone} type="tel" required />
              {otpSent && <Field label="6-digit code" value={otp} onChange={setOtp} required />}
              <button disabled={loading} className="mt-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {loading ? "Please wait…" : otpSent ? "Verify & create account" : "Send code"}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
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
