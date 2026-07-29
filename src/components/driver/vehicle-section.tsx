import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, Panel } from "@/components/provider/dashboard-kit";
import { VEHICLE_TYPES } from "@/lib/delivery-config";

export function VehicleSection({ userId, vehicles }: { userId: string; vehicles: any[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ vehicle_type: "bike", make: "", model: "", colour: "", plate: "", capacity_kg: "" });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.plate.trim()) throw new Error("Licence plate is required");
      const { error } = await supabase.from("vehicles").insert({
        user_id: userId,
        vehicle_type: form.vehicle_type,
        make: form.make || null,
        model: form.model || null,
        colour: form.colour || null,
        plate: form.plate.trim().toUpperCase(),
        capacity_kg: form.capacity_kg ? Number(form.capacity_kg) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehicle added");
      setForm({ vehicle_type: "bike", make: "", model: "", colour: "", plate: "", capacity_kg: "" });
      qc.invalidateQueries({ queryKey: ["driver-vehicles"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not add vehicle"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["driver-vehicles"] }),
  });

  const field = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <div className="space-y-4">
      <Panel title="Your vehicles" description="Registered vehicles you can deliver with">
        {vehicles.length === 0 ? (
          <EmptyState title="No vehicle on file" hint="Add one below to start receiving delivery offers." />
        ) : (
          <ul className="space-y-2">
            {vehicles.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-2xl border border-border/70 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                  <Truck className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {[v.make, v.model].filter(Boolean).join(" ") || VEHICLE_TYPES.find((t) => t.value === v.vehicle_type)?.label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {v.plate}
                    {v.colour ? ` · ${v.colour}` : ""}
                    {v.capacity_kg ? ` · ${v.capacity_kg}kg` : ""}
                  </p>
                </div>
                <button
                  onClick={() => remove.mutate(v.id)}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-destructive"
                  aria-label="Remove vehicle"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Add a vehicle">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">
            Type
            <select
              className={`${field} mt-1`}
              value={form.vehicle_type}
              onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Licence plate
            <input className={`${field} mt-1`} value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} placeholder="ADI 1234" />
          </label>
          <label className="text-xs text-muted-foreground">
            Make
            <input className={`${field} mt-1`} value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="Toyota" />
          </label>
          <label className="text-xs text-muted-foreground">
            Model
            <input className={`${field} mt-1`} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Hiace" />
          </label>
          <label className="text-xs text-muted-foreground">
            Colour
            <input className={`${field} mt-1`} value={form.colour} onChange={(e) => setForm({ ...form, colour: e.target.value })} placeholder="White" />
          </label>
          <label className="text-xs text-muted-foreground">
            Capacity (kg)
            <input className={`${field} mt-1`} type="number" value={form.capacity_kg} onChange={(e) => setForm({ ...form, capacity_kg: e.target.value })} placeholder="500" />
          </label>
        </div>
        <button
          disabled={add.isPending}
          onClick={() => add.mutate()}
          className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto sm:px-6"
        >
          Add vehicle
        </button>
      </Panel>
    </div>
  );
}
