import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  CheckField,
  Field,
  PasswordField,
  SelectField,
  StepBar,
  SubmitButton,
  TextareaField,
} from "@/components/auth/auth-ui";
import { supabase } from "@/integrations/supabase/client";
import { services } from "@/data/services";

const title = "Become a Zwits provider — register your business";
const description =
  "Register in five guided steps to receive job requests, manage bookings and get paid weekly on Zwits.";

export const Route = createFileRoute("/provider-signup")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://zwits.co.zw/provider-signup" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://zwits.co.zw/provider-signup" }],
  }),
  component: ProviderSignup,
});

const STEPS = ["Account", "Identity", "Services", "Payouts", "Review"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ProviderSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [account, setAccount] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    password: "",
    confirm: "",
  });
  const [identity, setIdentity] = useState({
    nationalId: "",
    businessType: "",
    yearsExperience: "",
    businessAddress: "",
  });
  const [work, setWork] = useState({
    categories: [] as string[],
    areas: "",
    maxTravelKm: "15",
    emergency: false,
    website: "",
    socialHandle: "",
  });
  const [payout, setPayout] = useState({
    method: "",
    bankName: "",
    bankAccount: "",
    mobileMoney: "",
    taxNumber: "",
    workStart: "08:00",
    workEnd: "17:00",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"] as string[],
  });
  const [terms, setTerms] = useState(false);
  const [consent, setConsent] = useState(false);

  const setA = (k: keyof typeof account) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAccount((f) => ({ ...f, [k]: e.target.value }));
  const setI = (k: keyof typeof identity) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setIdentity((f) => ({ ...f, [k]: e.target.value }));

  const toggleCategory = (slug: string) =>
    setWork((w) => ({
      ...w,
      categories: w.categories.includes(slug)
        ? w.categories.filter((c) => c !== slug)
        : [...w.categories, slug],
    }));

  const toggleDay = (d: string) =>
    setPayout((p) => ({ ...p, days: p.days.includes(d) ? p.days.filter((x) => x !== d) : [...p.days, d] }));

  const canContinue = useMemo(() => {
    if (step === 1)
      return (
        account.fullName.trim() &&
        account.email.trim() &&
        account.phone.trim() &&
        account.password.length >= 8 &&
        account.password === account.confirm
      );
    if (step === 2) return identity.nationalId.trim() && identity.businessType;
    if (step === 3) return work.categories.length > 0 && work.areas.trim();
    if (step === 4) return !!payout.method && payout.days.length > 0;
    return terms && consent;
  }, [step, account, identity, work, payout, terms, consent]);

  const next = () => {
    if (!canContinue) return toast.error("Please complete the highlighted details first.");
    setStep((s) => Math.min(5, s + 1));
  };

  const submit = async () => {
    if (!canContinue) return toast.error("Please accept the terms and background check to finish.");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: account.email.trim(),
      password: account.password,
      options: {
        emailRedirectTo: `${window.location.origin}/provider/dashboard`,
        data: { display_name: account.fullName.trim(), phone: account.phone.trim() },
      },
    });

    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }

    if (!data.session || !data.user) {
      setLoading(false);
      toast.success("Account created — check your inbox and spam folder for the confirmation email.");
      navigate({ to: "/resend-confirmation" });
      return;
    }

    const userId = data.user.id;

    await supabase
      .from("profiles")
      .update({
        display_name: account.fullName.trim(),
        phone: account.phone.trim() || null,
        city: account.city.trim() || null,
        country: "Zimbabwe",
        account_type: "provider",
        terms_accepted_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    const { error: onboardingError } = await supabase.from("provider_onboarding").upsert(
      {
        user_id: userId,
        completed_step: 5,
        national_id: identity.nationalId.trim(),
        business_type: identity.businessType,
        business_address: identity.businessAddress.trim() || null,
        years_experience: identity.yearsExperience ? Number(identity.yearsExperience) : null,
        city: account.city.trim() || null,
        country: "Zimbabwe",
        service_categories: work.categories,
        service_areas: work.areas
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        max_travel_km: Number(work.maxTravelKm) || 15,
        emergency_services: work.emergency,
        website: work.website.trim() || null,
        social_handle: work.socialHandle.trim() || null,
        payout_method: payout.method,
        bank_name: payout.bankName.trim() || null,
        bank_account: payout.bankAccount.trim() || null,
        mobile_money_number: payout.mobileMoney.trim() || null,
        tax_number: payout.taxNumber.trim() || null,
        work_start: payout.workStart,
        work_end: payout.workEnd,
        working_days: payout.days,
        background_check_consent: consent,
      },
      { onConflict: "user_id" },
    );

    setLoading(false);
    if (onboardingError) return toast.error(onboardingError.message);

    toast.success("Registration received — let's finish your provider profile.");
    navigate({ to: "/provider/setup", replace: true });
  };

  return (
    <AuthShell
      variant="provider"
      wide
      title="Grow Your Business With Zwits"
      subtitle="Register in five quick steps, get verified, and start receiving job requests from customers near you."
      footer={
        <>
          Already registered?{" "}
          <Link to="/provider-login" className="font-medium text-primary hover:underline">
            Provider login
          </Link>
        </>
      }
    >
      <StepBar step={step} total={5} labels={STEPS} />

      {step === 1 && (
        <div className="grid gap-4">
          <Field label="Full name" value={account.fullName} onChange={setA("fullName")} autoComplete="name" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" type="email" value={account.email} onChange={setA("email")} required />
            <Field label="Phone number" value={account.phone} onChange={setA("phone")} placeholder="+263 77 123 4567" required />
          </div>
          <Field label="City" value={account.city} onChange={setA("city")} placeholder="Harare" />
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField
              label="Password"
              value={account.password}
              onChange={(v) => setAccount((f) => ({ ...f, password: v }))}
              autoComplete="new-password"
              hint="At least 8 characters"
            />
            <PasswordField
              label="Confirm password"
              value={account.confirm}
              onChange={(v) => setAccount((f) => ({ ...f, confirm: v }))}
              autoComplete="new-password"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <Field label="National ID / passport number" value={identity.nationalId} onChange={setI("nationalId")} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Business type"
              value={identity.businessType}
              onChange={(v) => setIdentity((f) => ({ ...f, businessType: v }))}
              options={[
                { value: "individual", label: "Individual professional" },
                { value: "registered", label: "Registered company" },
                { value: "team", label: "Team / crew" },
              ]}
            />
            <Field
              label="Years of experience"
              type="number"
              min={0}
              value={identity.yearsExperience}
              onChange={setI("yearsExperience")}
            />
          </div>
          <Field label="Business address" value={identity.businessAddress} onChange={setI("businessAddress")} />
          <p className="rounded-2xl bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground">
            Document uploads (ID photo, selfie and certificates) happen right after registration in your provider
            verification centre.
          </p>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Service categories</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {services.map((s) => {
                const active = work.categories.includes(s.slug);
                return (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => toggleCategory(s.slug)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition ${
                      active
                        ? "border-primary bg-primary/12 text-primary"
                        : "border-input bg-background/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {active ? <Check className="size-3.5" /> : null}
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
          <TextareaField
            label="Service areas (comma separated)"
            value={work.areas}
            onChange={(v) => setWork((w) => ({ ...w, areas: v }))}
            placeholder="Harare CBD, Avondale, Borrowdale"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Maximum travel distance (km)"
              type="number"
              min={1}
              value={work.maxTravelKm}
              onChange={(e) => setWork((w) => ({ ...w, maxTravelKm: e.target.value }))}
            />
            <Field
              label="Website (optional)"
              value={work.website}
              onChange={(e) => setWork((w) => ({ ...w, website: e.target.value }))}
            />
          </div>
          <Field
            label="Social handle (optional)"
            value={work.socialHandle}
            onChange={(e) => setWork((w) => ({ ...w, socialHandle: e.target.value }))}
          />
          <CheckField checked={work.emergency} onChange={(v) => setWork((w) => ({ ...w, emergency: v }))}>
            I'm available for emergency / after-hours callouts
          </CheckField>
        </div>
      )}

      {step === 4 && (
        <div className="grid gap-4">
          <SelectField
            label="Preferred payout method"
            value={payout.method}
            onChange={(v) => setPayout((p) => ({ ...p, method: v }))}
            options={[
              { value: "mobile_money", label: "Mobile money (EcoCash / OneMoney)" },
              { value: "bank", label: "Bank transfer" },
              { value: "wallet", label: "Keep in Zwits wallet" },
            ]}
          />
          {payout.method === "bank" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Bank name"
                value={payout.bankName}
                onChange={(e) => setPayout((p) => ({ ...p, bankName: e.target.value }))}
              />
              <Field
                label="Account number"
                value={payout.bankAccount}
                onChange={(e) => setPayout((p) => ({ ...p, bankAccount: e.target.value }))}
              />
            </div>
          )}
          {payout.method === "mobile_money" && (
            <Field
              label="Mobile money number"
              value={payout.mobileMoney}
              onChange={(e) => setPayout((p) => ({ ...p, mobileMoney: e.target.value }))}
              placeholder="+263 77 123 4567"
            />
          )}
          <Field
            label="Tax number (optional)"
            value={payout.taxNumber}
            onChange={(e) => setPayout((p) => ({ ...p, taxNumber: e.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Working hours from"
              type="time"
              value={payout.workStart}
              onChange={(e) => setPayout((p) => ({ ...p, workStart: e.target.value }))}
            />
            <Field
              label="Working hours to"
              type="time"
              value={payout.workEnd}
              onChange={(e) => setPayout((p) => ({ ...p, workEnd: e.target.value }))}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Working days</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const active = payout.days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`rounded-full border px-3.5 py-2 text-sm transition ${
                      active
                        ? "border-primary bg-primary/12 text-primary"
                        : "border-input bg-background/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="grid gap-5">
          <dl className="grid gap-3 rounded-2xl bg-muted/40 p-5 text-sm">
            <Row label="Name" value={account.fullName} />
            <Row label="Contact" value={`${account.email} · ${account.phone}`} />
            <Row label="Business type" value={identity.businessType || "—"} />
            <Row
              label="Services"
              value={
                work.categories
                  .map((c) => services.find((s) => s.slug === c)?.name ?? c)
                  .join(", ") || "—"
              }
            />
            <Row label="Areas" value={work.areas || "—"} />
            <Row label="Payouts" value={payout.method || "—"} />
            <Row label="Availability" value={`${payout.days.join(", ")} · ${payout.workStart}–${payout.workEnd}`} />
          </dl>

          <CheckField checked={terms} onChange={setTerms}>
            I accept the{" "}
            <Link to="/terms" className="text-primary hover:underline">
              provider terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              privacy policy
            </Link>
            .
          </CheckField>
          <CheckField checked={consent} onChange={setConsent}>
            I consent to identity and background verification checks.
          </CheckField>
        </div>
      )}

      <div className="mt-7 flex items-center gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex items-center gap-2 rounded-2xl border border-input bg-background/60 px-5 py-3.5 text-sm font-semibold transition hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        )}
        <div className="flex-1">
          {step < 5 ? (
            <SubmitButton type="button" onClick={next}>
              Continue
              <ArrowRight className="size-4" />
            </SubmitButton>
          ) : (
            <SubmitButton type="button" loading={loading} onClick={submit}>
              Submit registration
            </SubmitButton>
          )}
        </div>
      </div>
    </AuthShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
