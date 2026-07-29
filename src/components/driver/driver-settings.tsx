import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Panel } from "@/components/provider/dashboard-kit";
import { supabase } from "@/integrations/supabase/client";

export function DriverSettings({ userId, profile }: { userId: string; profile: any }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
    city: profile?.city ?? "Harare",
    zone_radius_km: String(profile?.zone_radius_km ?? 10),
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("driver_profiles").upsert(
        {
          user_id: userId,
          full_name: form.full_name || null,
          phone: form.phone || null,
          city: form.city || "Harare",
          zone_radius_km: Number(form.zone_radius_km) || 10,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["driver-profile"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save"),
  });

  const field = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <Panel title="Driver settings" description="Your details and delivery zone">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Full name
          <input className={`${field} mt-1`} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </label>
        <label className="text-xs text-muted-foreground">
          Phone
          <input className={`${field} mt-1`} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+263…" />
        </label>
        <label className="text-xs text-muted-foreground">
          City
          <input className={`${field} mt-1`} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </label>
        <label className="text-xs text-muted-foreground">
          Delivery radius (km)
          <input
            className={`${field} mt-1`}
            type="number"
            min={1}
            max={80}
            value={form.zone_radius_km}
            onChange={(e) => setForm({ ...form, zone_radius_km: e.target.value })}
          />
        </label>
      </div>
      <button
        disabled={save.isPending}
        onClick={() => save.mutate()}
        className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto sm:px-6"
      >
        Save settings
      </button>
    </Panel>
  );
}
