import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";

const inputClass =
  "w-full rounded-2xl border border-input bg-background/70 px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/25";

export function Field({
  label,
  hint,
  className,
  ...props
}: { label: string; hint?: string; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`grid gap-1.5 ${className ?? ""}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input {...props} className={inputClass} />
      {hint ? <span className="text-[11px] text-muted-foreground/80">{hint}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select required={required} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextareaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete = "current-password",
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          required={required}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {hint ? <span className="text-[11px] text-muted-foreground/80">{hint}</span> : null}
    </label>
  );
}

export function CheckField({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 rounded border-input accent-[var(--primary)]"
      />
      <span>{children}</span>
    </label>
  );
}

export function SubmitButton({
  loading,
  children,
  type = "submit",
  onClick,
  disabled,
}: {
  loading?: boolean;
  children: ReactNode;
  type?: "submit" | "button";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-60"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-full items-center justify-center rounded-2xl border border-input bg-background/60 px-6 py-3.5 text-sm font-semibold transition hover:bg-muted"
    >
      {children}
    </button>
  );
}

export function Divider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Managed social sign-in. Runs the Lovable OAuth broker, then returns control to the caller. */
export const OAUTH_INTENT_KEY = "zwits.authIntent";

/**
 * `intent` is the role the entry point implies (customer login vs provider
 * signup). It is remembered locally so the OAuth return can route correctly —
 * the role itself is still granted server-side, never trusted from the client.
 */
export function SocialButtons({
  onSignedIn,
  intent = "customer",
}: {
  onSignedIn: () => void;
  intent?: "customer" | "provider" | "driver" | "business";
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (provider: "google" | "apple") => {
    setBusy(provider);
    try {
      sessionStorage.setItem(OAUTH_INTENT_KEY, intent);
    } catch {
      /* private mode — the callback falls back to role selection */
    }
    // Must be a PUBLIC same-origin URL: full-page OAuth returns before the
    // session is set, so a protected route would bounce the user out.
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/auth/callback?intent=${intent}`,
    });
    setBusy(null);
    if (result.error) {
      toast.error(`${provider === "google" ? "Google" : "Apple"} sign-in failed. Please try again.`);
      return;
    }
    if (result.redirected) return;
    onSignedIn();
  };

  return (
    <div className="grid gap-2.5">
      <SocialButton label="Continue with Google" busy={busy === "google"} onClick={() => run("google")}>
        <GoogleMark />
      </SocialButton>
      <SocialButton label="Continue with Apple" busy={busy === "apple"} onClick={() => run("apple")}>
        <AppleMark />
      </SocialButton>
    </div>
  );
}

function SocialButton({
  label,
  busy,
  onClick,
  children,
}: {
  label: string;
  busy: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-input bg-background/60 px-4 py-3 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : children}
      {label}
    </button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
      <path d="M16.4 12.7c0-2.4 2-3.6 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9-.7 0-1.9-.9-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.5.8 1.2 1.7 2.5 3 2.4 1.2 0 1.6-.8 3.1-.8 1.4 0 1.8.8 3.1.7 1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7 0 0-2.5-1-2.6-3.8ZM14.1 5.3c.7-.8 1.1-1.9 1-3-1 0-2.2.6-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.5Z" />
    </svg>
  );
}

export function StepBar({ step, total, labels }: { step: number; total: number; labels: string[] }) {
  return (
    <div className="mb-7">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              i < step ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Step {step} of {total} · <span className="text-foreground">{labels[step - 1]}</span>
      </p>
    </div>
  );
}
