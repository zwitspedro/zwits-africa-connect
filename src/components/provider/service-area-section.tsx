import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPinned, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel } from "./dashboard-kit";
import type { ProviderData } from "./use-provider-data";

const SUGGESTED = [
  "Harare CBD",
  "Avondale",
  "Borrowdale",
  "Mount Pleasant",
  "Highfield",
  "Chitungwiza",
  "Waterfalls",
  "Glen View",
  "Bulawayo CBD",
];

export function ServiceAreaSection({ data }: { data: ProviderData }) {
  const { user, onboardingRow } = data;
  const qc = useQueryClient();
  const [areas, setAreas] = useState<string[]>(onboardingRow?.service_areas ?? []);
  const [radius, setRadius] = useState(String(onboardingRow?.max_travel_km ?? 10));
  const [start, setStart] = useState(onboardingRow?.work_start ?? "08:00");
  const [end, setEnd] = useState(onboardingRow?.work_end ?? "17:00");
  const [draft, setDraft] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("provider_onboarding").upsert(
        {
          user_id: user!.id,
          service_areas: areas,
          max_travel_km: Number(radius) || 0,
          work_start: start,
          work_end: end,
        } as any,
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved ✓");
      qc.invalidateQueries({ queryKey: ["provider-onboarding-row"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save"),
  });

  const add = (value: string) => {
    const v = value.trim();
    if (!v || areas.includes(v)) return;
    setAreas([...areas, v]);
    setDraft("");
  };

  return (
    <Panel title="Service area" description="Only jobs inside these areas and radius are offered to you.">
      <div className="grid gap-4">
        <div>
          <span className="text-xs text-muted-foreground">Areas you cover</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {areas.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-3 py-1.5 text-xs font-medium text-primary">
                {a}
                <button type="button" onClick={() => setAreas(areas.filter((x) => x !== a))} aria-label={`Remove ${a}`}>
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
            {areas.length === 0 && <span className="text-xs text-muted-foreground">No areas added yet.</span>}
          </div>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add(draft);
                }
              }}
              placeholder="Add a suburb or town"
              className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <button
              type="button"
              onClick={() => add(draft)}
              className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="size-4" /> Add
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTED.filter((s) => !areas.includes(s)).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>

        <label className="grid gap-1 text-xs">
          <span className="text-muted-foreground">Maximum travel radius: {radius} km</span>
          <input
            type="range"
            min={1}
            max={60}
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="h-11 accent-[var(--color-primary)]"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">Working hours from</span>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm" />
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">Working hours to</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm" />
          </label>
        </div>

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          <MapPinned className="size-4" /> {save.isPending ? "Saving…" : "Save service area"}
        </button>
      </div>
    </Panel>
  );
}
