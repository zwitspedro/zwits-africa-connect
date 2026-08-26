import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site-shell";
import { PageHero } from "@/components/page-hero";
import { ShieldCheck, Wallet, Star, Clock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { services } from "@/data/services";

export const Route = createFileRoute("/become-a-provider")({
  head: () => ({
    meta: [
      { title: "Become a Provider — Zwits" },
      { name: "description", content: "Earn flexible income on Zwits. Register as a verified service provider." },
      { property: "og:url", content: "https://www.zwits.co.zw/become-a-provider" },
      // Application funnel. /providers is the canonical recruitment landing page.
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://www.zwits.co.zw/become-a-provider" }],
  }),
  component: Provider,
});

const perks = [
  { icon: Wallet, title: "Get paid fast", text: "Direct payouts to EcoCash, InnBucks or your bank." },
  { icon: Clock, title: "You set the hours", text: "Toggle availability whenever you're ready to work." },
  { icon: Star, title: "Build a reputation", text: "Great ratings unlock more jobs and bigger earnings." },
  { icon: ShieldCheck, title: "Protected & verified", text: "ID and background checks keep the platform safe." },
];

export const PROVIDER_PREFILL_KEY = "zwits:provider-prefill";

type Prefill = {
  business_name: string;
  phone: string;
  city: string;
  category: string;
  bio: string;
};

function Provider() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Prefill>({
    business_name: "",
    phone: "",
    city: "",
    category: services[0].slug,
    bio: "",
  });

  const update = <K extends keyof Prefill>(k: K, v: Prefill[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.business_name.trim() || !form.city.trim() || !form.phone.trim()) {
      toast.error("Please fill in name, phone and city.");
      return;
    }
    setSubmitting(true);
    try {
      sessionStorage.setItem(PROVIDER_PREFILL_KEY, JSON.stringify(form));
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        toast.success("Let's finish your verification.");
        navigate({ to: "/provider/setup" });
      } else {
        toast.success("Create an account to finish registering.");
        navigate({ to: "/signup", search: { redirect: "/provider/setup" } as any });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteShell>
      <PageHero eyebrow="Earn with Zwits" title="Your skill. Your hours. Real income.">
        Join 1,400+ providers earning on Zwits across Zimbabwe.
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="rounded-2xl border border-border bg-card p-6">
                <Icon className="size-6 text-primary" />
                <h3 className="mt-4 font-display text-lg font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
              </div>
            );
          })}
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-14 rounded-3xl border border-gold/30 bg-card p-6 md:p-10"
        >
          <h2 className="font-display text-3xl font-bold">Register as a provider</h2>
          <p className="mt-2 text-muted-foreground">
            Tell us the basics — next you'll create an account and upload your ID, selfie and business doc for instant verification.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Input
              label="Business / your name *"
              value={form.business_name}
              onChange={(v) => update("business_name", v)}
              placeholder="e.g. Tanaka Plumbing"
            />
            <Input
              label="Phone number *"
              type="tel"
              value={form.phone}
              onChange={(v) => update("phone", v)}
              placeholder="+263 77 123 4567"
            />
            <Input
              label="City *"
              value={form.city}
              onChange={(v) => update("city", v)}
              placeholder="Harare"
            />
            <label className="grid gap-1.5">
              <span className="text-xs text-muted-foreground">Service category *</span>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {services.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <Input
              className="md:col-span-2"
              label="Tell us about your experience"
              textarea
              value={form.bio}
              onChange={(v) => update("bio", v)}
              placeholder="Years of experience, specialities, certifications…"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Continuing…" : "Continue to verification"}
            <ArrowRight className="size-4" />
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            You'll create an account (or sign in) and then upload your verification documents.
          </p>
        </form>
      </section>
    </SiteShell>
  );
}

function Input({
  label,
  type = "text",
  textarea = false,
  placeholder,
  className = "",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  textarea?: boolean;
  placeholder?: string;
  className?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea
          rows={4}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      )}
    </label>
  );
}
