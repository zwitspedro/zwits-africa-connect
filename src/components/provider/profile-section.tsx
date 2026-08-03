import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, ShieldAlert, User } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Panel } from "./dashboard-kit";
import type { ProviderData } from "./use-provider-data";

const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  approved: { label: "Verified", tone: "bg-emerald-500/15 text-emerald-400" },
  pending: { label: "Under review", tone: "bg-gold/20 text-gold" },
  unverified: { label: "Not verified", tone: "bg-muted text-muted-foreground" },
  revoked: { label: "Revoked", tone: "bg-destructive/15 text-destructive" },
};

export function ProfileSection({ data }: { data: ProviderData }) {
  const { provider, profile, user } = data;
  const qc = useQueryClient();
  const [form, setForm] = useState({
    display_name: profile?.display_name ?? "",
    phone: profile?.phone ?? "",
    business_name: provider?.business_name ?? "",
    bio: provider?.bio ?? "",
    city: provider?.city ?? "",
    hourly_rate: String(provider?.hourly_rate ?? ""),
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error: pe } = await supabase
        .from("profiles")
        .update({ display_name: form.display_name, phone: form.phone })
        .eq("user_id", user!.id);
      if (pe) throw pe;
      if (provider?.id) {
        const { error: ve } = await supabase
          .from("providers")
          .update({
            business_name: form.business_name,
            bio: form.bio,
            city: form.city,
            hourly_rate: Number(form.hourly_rate) || 0,
          })
          .eq("id", provider.id);
        if (ve) throw ve;
      }
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["my-provider"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save"),
  });

  const status = STATUS_COPY[provider?.verification_status ?? "unverified"];

  return (
    <div className="grid gap-4">
      <Panel title="Public profile" description="This is what customers see when you are matched to a job.">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-muted">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={form.display_name || "Provider avatar"} className="size-full object-cover" />
            ) : (
              <User className="size-7 text-muted-foreground" />
            )}
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-display text-xl font-semibold">{form.business_name || form.display_name || "Your business"}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 ${status.tone}`}>
                <BadgeCheck className="size-3" /> {status.label}
              </span>
              <span className="capitalize">{provider?.category}</span>
              <span>{Number(provider?.rating_avg ?? 0).toFixed(1)}★ · {provider?.jobs_completed ?? 0} jobs</span>
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="mt-5 grid gap-3 sm:grid-cols-2"
        >
          <Field label="Full name" value={form.display_name} onChange={(v) => setForm({ ...form, display_name: v })} />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="Business name" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} />
          <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="Hourly rate (USD)" type="number" value={form.hourly_rate} onChange={(v) => setForm({ ...form, hourly_rate: v })} />
          <label className="grid gap-1 text-xs sm:col-span-2">
            <span className="text-muted-foreground">Bio / services offered</span>
            <textarea
              rows={4}
              maxLength={800}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <button
            disabled={save.isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
          >
            {save.isPending ? "Saving…" : "Save profile"}
          </button>
        </form>
      </Panel>

      {provider?.verification_status !== "approved" && (
        <Panel title="Verification" description="Verified providers receive job offers.">
          <div className="flex flex-wrap items-center gap-3">
            <ShieldAlert className="size-5 text-gold" />
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">
              Upload your ID, a selfie and a business document to get verified.
            </p>
            <Link
              to="/provider/setup"
              className="inline-flex min-h-10 items-center rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground"
            >
              Continue verification
            </Link>
          </div>
        </Panel>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}
