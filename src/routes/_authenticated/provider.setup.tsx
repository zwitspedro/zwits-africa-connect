import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { services } from "@/data/services";

export const Route = createFileRoute("/_authenticated/provider/setup")({
  head: () => ({ meta: [{ title: "Become a provider — Zwits" }] }),
  component: ProviderSetup,
});

function ProviderSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState(services[0].slug);
  const [city, setCity] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [bio, setBio] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("providers").insert({
        user_id: user!.id, business_name: businessName, category, city,
        hourly_rate: Number(hourlyRate) || 0, bio,
      });
      if (error) throw error;
      // Add provider role
      await supabase.from("user_roles").insert({ user_id: user!.id, role: "provider" });
    },
    onSuccess: () => {
      toast.success("Provider profile created");
      navigate({ to: "/provider" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <SiteShell>
      <section className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold">Become a Zwits provider</h1>
        <p className="mt-2 text-sm text-muted-foreground">Set up your business profile to start receiving jobs.</p>

        <form
          onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
          className="mt-6 grid gap-4 rounded-3xl border border-border bg-card p-6"
        >
          <Field label="Business / professional name" value={businessName} onChange={setBusinessName} required />
          <label className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">Service category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
              {services.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          </label>
          <Field label="City" value={city} onChange={setCity} required />
          <Field label="Hourly rate (USD)" value={hourlyRate} onChange={setHourlyRate} type="number" required />
          <label className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">About you</span>
            <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
          </label>
          <button disabled={submit.isPending} className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {submit.isPending ? "Saving…" : "Create provider profile"}
          </button>
        </form>
      </section>
    </SiteShell>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
    </label>
  );
}
