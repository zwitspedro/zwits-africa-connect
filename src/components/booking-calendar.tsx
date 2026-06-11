import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Clock, HelpCircle, Zap } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SchedulingRules } from "@/data/services";
import { getProviderBusySlots } from "@/lib/provider-availability.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  rules: SchedulingRules;
  /** ISO string or "" for ASAP */
  value: string;
  onChange: (iso: string) => void;
  /** Provider to check availability for. null/undefined = auto-match (no filtering). */
  providerId?: string | null;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function generateSlots(date: Date, rules: SchedulingRules, now: Date): Date[] {
  const slots: Date[] = [];
  const earliest = new Date(now.getTime() + rules.leadHours * 60 * 60 * 1000);
  const startMins = rules.hoursStart * 60;
  const endMins = rules.hoursEnd * 60;
  for (let m = startMins; m < endMins; m += rules.slotMinutes) {
    const slot = new Date(date);
    slot.setHours(0, 0, 0, 0);
    slot.setMinutes(m);
    if (slot < earliest) continue;
    slots.push(slot);
  }
  return slots;
}

export function BookingCalendar({ rules, value, onChange, providerId }: Props) {
  const now = useMemo(() => new Date(), []);
  const qc = useQueryClient();
  const fetchBusy = useServerFn(getProviderBusySlots);
  const [date, setDate] = useState<Date | undefined>(() => {
    if (value && value !== "ASAP") return startOfDay(new Date(value));
    return undefined;
  });
  const asap = value === "ASAP";

  const today = startOfDay(now);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + rules.maxDaysAhead);

  const slots = useMemo(() => (date ? generateSlots(date, rules, now) : []), [date, rules, now]);

  const dayStartIso = date ? startOfDay(date).toISOString() : null;
  const dayEndIso = date
    ? new Date(startOfDay(date).getTime() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  const busyKey = ["provider-busy", providerId, dayStartIso] as const;
  const { data: busy = [] } = useQuery({
    queryKey: busyKey,
    enabled: !!providerId && !!dayStartIso && !!dayEndIso,
    queryFn: () =>
      fetchBusy({
        data: { providerId: providerId!, dayStartIso: dayStartIso!, dayEndIso: dayEndIso! },
      }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  // Live updates: when this provider's bookings change, refetch busy slots.
  useEffect(() => {
    if (!providerId) return;
    const channel = supabase
      .channel(`provider-busy:${providerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `provider_id=eq.${providerId}` },
        () => qc.invalidateQueries({ queryKey: ["provider-busy", providerId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [providerId, qc]);

  // Booked slot starts overlapping the service slot length
  const busyStarts = useMemo(() => {
    const set = new Set<number>();
    const slotMs = rules.slotMinutes * 60 * 1000;
    for (const b of busy) {
      const t = new Date(b.start).getTime();
      // Floor to slot grid
      const dayStart = dayStartIso ? new Date(dayStartIso).getTime() : t;
      const offset = Math.floor((t - dayStart) / slotMs) * slotMs;
      set.add(dayStart + offset);
    }
    return set;
  }, [busy, rules.slotMinutes, dayStartIso]);

  const selectedTimeIso = !asap && value ? value : null;
  const availableCount = slots.filter((s) => !busyStarts.has(s.getTime())).length;

  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-card/50 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays className="size-3.5" /> Pick a date and time
        <span className="ml-auto">
          {rules.slotMinutes >= 60
            ? `${rules.slotMinutes / 60}h slots`
            : `${rules.slotMinutes}-min slots`}
          {" · "}
          {rules.leadHours > 0 ? `${rules.leadHours}h lead` : "no lead time"}
        </span>
      </div>

      {rules.allowAsap && (
        <button
          type="button"
          onClick={() => {
            onChange("ASAP");
            setDate(undefined);
          }}
          className={cn(
            "flex items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm transition",
            asap
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-background hover:border-primary/40"
          )}
        >
          <span className="flex items-center gap-2">
            <Zap className="size-4 text-primary" /> ASAP — next available
          </span>
          <span className="text-xs text-muted-foreground">Recommended</span>
        </button>
      )}

      <div className="grid gap-3 sm:grid-cols-[auto,1fr]">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            setDate(d);
            if (!d) return;
            if (value && value !== "ASAP") {
              const prev = startOfDay(new Date(value));
              if (prev.getTime() !== startOfDay(d).getTime()) onChange("");
            }
          }}
          disabled={(d) => {
            const day = startOfDay(d);
            if (day < today) return true;
            if (day > maxDate) return true;
            if (!rules.workingDays.includes(day.getDay())) return true;
            if (day.getTime() === today.getTime()) {
              return generateSlots(day, rules, now).length === 0;
            }
            return false;
          }}
          className="pointer-events-auto rounded-xl border border-border bg-background p-2"
        />

        <div className="min-h-[12rem]">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {date
              ? `${availableCount} of ${slots.length} slots free on ${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`
              : asap
                ? "ASAP selected — no time slot needed"
                : "Select a date"}
          </div>
          {date && (
            <div className="grid max-h-64 grid-cols-3 gap-1.5 overflow-auto pr-1 sm:grid-cols-2 md:grid-cols-3">
              {slots.length === 0 && (
                <p className="col-span-full text-xs text-muted-foreground">
                  No slots available — pick another day.
                </p>
              )}
              {slots.map((s) => {
                const iso = s.toISOString();
                const active = selectedTimeIso === iso;
                const taken = busyStarts.has(s.getTime());
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={taken}
                    onClick={() => onChange(iso)}
                    title={taken ? "Already booked" : undefined}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-xs tabular-nums transition",
                      taken
                        ? "cursor-not-allowed border-dashed border-border bg-muted/40 text-muted-foreground/60 line-through"
                        : active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary/40"
                    )}
                  >
                    {s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </button>
                );
              })}
            </div>
          )}
          {!providerId && date && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Auto-match selected — availability will be confirmed once a provider accepts.
            </p>
          )}
        </div>
      </div>

      {value && value !== "ASAP" && (
        <p className="text-xs text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{new Date(value).toLocaleString()}</span>
        </p>
      )}
    </div>
  );
}
