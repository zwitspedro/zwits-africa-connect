import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, FileUp, Trash2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, Panel } from "@/components/provider/dashboard-kit";
import { VEHICLE_TYPES } from "@/lib/delivery-config";

const field = "w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary";

async function uploadDoc(userId: string, key: string, file: File) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${key}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("provider-verification")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

export function VehicleSection({
  userId,
  vehicles,
  profile,
  onDone,
}: {
  userId: string;
  vehicles: any[];
  profile: any;
  onDone?: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    vehicle_type: "bike",
    make: "",
    model: "",
    colour: "",
    plate: "",
    capacity_kg: "",
  });
  const [insurance, setInsurance] = useState({
    insurance_provider: profile?.insurance_provider ?? "",
    insurance_expiry: profile?.insurance_expiry ?? "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["driver-vehicles"] });
    qc.invalidateQueries({ queryKey: ["driver-profile"] });
  };

  const add = useMutation({
    mutationFn: async () => {
      if (!form.plate.trim()) throw new Error("Licence plate is required");
      const photo_url = photo ? await uploadDoc(userId, "vehicle-photo", photo) : null;
      const { error } = await supabase.from("vehicles").insert({
        user_id: userId,
        vehicle_type: form.vehicle_type,
        make: form.make || null,
        model: form.model || null,
        colour: form.colour || null,
        plate: form.plate.trim().toUpperCase(),
        capacity_kg: form.capacity_kg ? Number(form.capacity_kg) : null,
        photo_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehicle saved");
      setForm({ vehicle_type: "bike", make: "", model: "", colour: "", plate: "", capacity_kg: "" });
      setPhoto(null);
      if (photoRef.current) photoRef.current.value = "";
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not add vehicle"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message ?? "Could not remove vehicle"),
  });

  const saveDocs = useMutation({
    mutationFn: async (files: { licence?: File | null; vehicleDoc?: File | null }) => {
      const patch: Record<string, any> = {
        user_id: userId,
        insurance_provider: insurance.insurance_provider || null,
        insurance_expiry: insurance.insurance_expiry || null,
      };
      if (files.licence) patch['licence_url'] = await uploadDoc(userId, "licence", files.licence);
      if (files.vehicleDoc) patch['vehicle_doc_url'] = await uploadDoc(userId, "vehicle-doc", files.vehicleDoc);
      const { error } = await supabase.from("driver_profiles").upsert(patch, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documents saved");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save documents"),
  });

  const [licence, setLicence] = useState<File | null>(null);
  const [vehicleDoc, setVehicleDoc] = useState<File | null>(null);

  const ready = vehicles.length > 0 && !!profile?.licence_url;

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
                    {[v.make, v.model].filter(Boolean).join(" ") ||
                      VEHICLE_TYPES.find((t) => t.value === v.vehicle_type)?.label}
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

      <Panel title="Add a vehicle" description="Licence plate is required">
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
          <label className="text-xs text-muted-foreground sm:col-span-2">
            Vehicle photo
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className={`${field} mt-1 file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs`}
            />
          </label>
        </div>
        <button
          disabled={add.isPending}
          onClick={() => add.mutate()}
          className="mt-4 min-h-12 w-full rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {add.isPending ? "Saving…" : "Save vehicle"}
        </button>
      </Panel>

      <Panel title="Driver documents" description="Driver's licence and insurance details">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">
            Driver&apos;s licence {profile?.licence_url && <span className="text-emerald-600">· uploaded</span>}
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setLicence(e.target.files?.[0] ?? null)}
              className={`${field} mt-1 file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs`}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Insurance / registration document {profile?.vehicle_doc_url && <span className="text-emerald-600">· uploaded</span>}
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setVehicleDoc(e.target.files?.[0] ?? null)}
              className={`${field} mt-1 file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs`}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Insurance provider
            <input
              className={`${field} mt-1`}
              value={insurance.insurance_provider}
              onChange={(e) => setInsurance({ ...insurance, insurance_provider: e.target.value })}
              placeholder="Old Mutual"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Insurance expiry
            <input
              type="date"
              className={`${field} mt-1`}
              value={insurance.insurance_expiry ?? ""}
              onChange={(e) => setInsurance({ ...insurance, insurance_expiry: e.target.value })}
            />
          </label>
        </div>
        <button
          disabled={saveDocs.isPending}
          onClick={() => saveDocs.mutate({ licence, vehicleDoc })}
          className="mt-4 min-h-12 w-full rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {saveDocs.isPending ? "Saving…" : "Save documents"}
        </button>
      </Panel>

      {onDone && (
        <button
          onClick={onDone}
          disabled={!ready}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-6 text-sm font-bold text-primary disabled:opacity-50"
        >
          <Check className="size-4" /> {ready ? "Save & continue" : "Add a vehicle and licence to continue"}
          {!ready && <FileUp className="size-4" />}
        </button>
      )}
    </div>
  );
}
