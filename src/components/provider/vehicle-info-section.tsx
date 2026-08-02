import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel } from "./dashboard-kit";
import type { ProviderData } from "./use-provider-data";

const TYPES = ["motorbike", "car", "van", "truck", "bicycle"];

export function VehicleInfoSection({ data }: { data: ProviderData }) {
  const { user, vehicles } = data;
  const qc = useQueryClient();
  const existing = vehicles[0];
  const [form, setForm] = useState({
    vehicle_type: existing?.vehicle_type ?? "car",
    make: existing?.make ?? "",
    model: existing?.model ?? "",
    colour: existing?.colour ?? "",
    plate: existing?.plate ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.plate.trim()) throw new Error("Registration number is required");
      const payload = {
        user_id: user!.id,
        vehicle_type: form.vehicle_type,
        make: form.make || null,
        model: form.model || null,
        colour: form.colour || null,
        plate: form.plate.trim().toUpperCase(),
        active: true,
      };
      const query = existing
        ? supabase.from("vehicles").update(payload as any).eq("id", existing.id)
        : supabase.from("vehicles").insert(payload as any);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved ✓");
      qc.invalidateQueries({ queryKey: ["provider-vehicles"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save"),
  });

  return (
    <Panel title="Vehicle information" description="Required for delivery, courier and moving jobs.">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs sm:col-span-2">
          <span className="text-muted-foreground">Vehicle type</span>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, vehicle_type: t })}
                className={`min-h-11 rounded-full px-4 text-sm font-medium capitalize transition ${
                  form.vehicle_type === t ? "bg-primary text-primary-foreground" : "border border-border/70 bg-background/40 text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </label>
        <Field label="Make" value={form.make} onChange={(v) => setForm({ ...form, make: v })} />
        <Field label="Model" value={form.model} onChange={(v) => setForm({ ...form, model: v })} />
        <Field label="Colour" value={form.colour} onChange={(v) => setForm({ ...form, colour: v })} />
        <Field label="Registration number" value={form.plate} onChange={(v) => setForm({ ...form, plate: v })} />
      </div>

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        <Car className="size-4" /> {save.isPending ? "Saving…" : "Save vehicle"}
      </button>
    </Panel>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="grid gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm" />
    </label>
  );
}
