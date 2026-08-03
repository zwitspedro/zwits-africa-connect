import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, User } from "lucide-react";
import { Panel } from "@/components/provider/dashboard-kit";
import { supabase } from "@/integrations/supabase/client";
import { secureUpload, MB } from "@/lib/secure-upload";
import { TIERS } from "@/lib/delivery-config";

const field = "w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary";

export function DriverSettings({
  userId,
  email,
  profile,
  avatarUrl,
  onDone,
}: {
  userId: string;
  email?: string | null;
  profile: any;
  avatarUrl?: string | null;
  onDone?: () => void;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<string | null>(avatarUrl ?? null);
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
    city: profile?.city ?? "Harare",
    address: profile?.address ?? "",
    zone_radius_km: String(profile?.zone_radius_km ?? 10),
    work_start: profile?.work_start ?? "08:00",
    work_end: profile?.work_end ?? "18:00",
    services: (profile?.services as string[]) ?? [],
  });

  const toggleService = (value: string) =>
    setForm((f) => ({
      ...f,
      services: f.services.includes(value) ? f.services.filter((s) => s !== value) : [...f.services, value],
    }));

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const { path } = await secureUpload(file, {
        bucket: "provider-verification",
        userId,
        prefix: "avatar",
        allowed: ["image/jpeg", "image/png", "image/webp"],
        maxBytes: 5 * MB,
      });
      const { data } = await supabase.storage.from("provider-verification").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = data?.signedUrl ?? null;
      const { error: pe } = await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", userId);
      if (pe) throw pe;
      return url;
    },
    onSuccess: (url) => {
      setAvatar(url);
      toast.success("Photo updated");
      qc.invalidateQueries({ queryKey: ["driver-user-profile"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not upload photo"),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Full name is required");
      if (!form.phone.trim()) throw new Error("Phone number is required");
      if (form.services.length === 0) throw new Error("Pick at least one service you offer");
      const { error } = await supabase.from("driver_profiles").upsert(
        {
          user_id: userId,
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          city: form.city || "Harare",
          address: form.address || null,
          zone_radius_km: Number(form.zone_radius_km) || 10,
          work_start: form.work_start || null,
          work_end: form.work_end || null,
          services: form.services,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      const { error: pe } = await supabase
        .from("profiles")
        .update({ display_name: form.full_name.trim(), phone: form.phone.trim(), city: form.city || null })
        .eq("user_id", userId);
      if (pe) throw pe;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["driver-profile"] });
      qc.invalidateQueries({ queryKey: ["driver-user-profile"] });
      onDone?.();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save"),
  });

  return (
    <Panel title="Personal & service details" description="Your details, services and delivery zone">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-muted">
          {avatar ? <img src={avatar} alt="" className="size-full object-cover" /> : <User className="size-7 text-muted-foreground" />}
        </span>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAvatar.mutate(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadAvatar.isPending}
            className="min-h-11 rounded-full border border-border px-5 text-sm font-semibold disabled:opacity-50"
          >
            {uploadAvatar.isPending ? "Uploading…" : "Change profile photo"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Full name
          <input className={`${field} mt-1`} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </label>
        <label className="text-xs text-muted-foreground">
          Phone
          <input className={`${field} mt-1`} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+263…" />
        </label>
        <label className="text-xs text-muted-foreground">
          Email
          <input className={`${field} mt-1 opacity-70`} value={email ?? ""} readOnly />
        </label>
        <label className="text-xs text-muted-foreground">
          City
          <input className={`${field} mt-1`} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </label>
        <label className="text-xs text-muted-foreground sm:col-span-2">
          Address
          <input className={`${field} mt-1`} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="12 Samora Machel Ave, Harare" />
        </label>
        <label className="text-xs text-muted-foreground">
          Working radius (km)
          <input
            className={`${field} mt-1`}
            type="number"
            min={1}
            max={80}
            value={form.zone_radius_km}
            onChange={(e) => setForm({ ...form, zone_radius_km: e.target.value })}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-muted-foreground">
            Start
            <input type="time" className={`${field} mt-1`} value={form.work_start} onChange={(e) => setForm({ ...form, work_start: e.target.value })} />
          </label>
          <label className="text-xs text-muted-foreground">
            End
            <input type="time" className={`${field} mt-1`} value={form.work_end} onChange={(e) => setForm({ ...form, work_end: e.target.value })} />
          </label>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">Services offered</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {Object.entries(TIERS).map(([key, tier]: [string, any]) => {
          const on = form.services.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleService(key)}
              className={`min-h-12 rounded-2xl border px-4 text-left text-sm font-semibold transition ${
                on ? "border-primary bg-primary/10 text-primary" : "border-border/70 bg-background/60"
              }`}
            >
              {tier.label ?? key}
            </button>
          );
        })}
      </div>

      <button
        disabled={save.isPending}
        onClick={() => save.mutate()}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        <Check className="size-4" /> {save.isPending ? "Saving…" : onDone ? "Save & continue" : "Save profile"}
      </button>
    </Panel>
  );
}
