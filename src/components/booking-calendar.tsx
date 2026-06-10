import { useMemo, useState } from "react";
import { CalendarDays, Clock, Zap } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import type { SchedulingRules } from "@/data/services";
import { cn } from "@/lib/utils";

type Props = {
  rules: SchedulingRules;
  /** ISO string or "" for ASAP */
  value: string;
  onChange: (iso: string) => void;
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

export function BookingCalendar({ rules, value, onChange }: Props) {
  const now = useMemo(() => new Date(), []);
  const [date, setDate] = useState<Date | undefined>(() => {
    if (value) return startOfDay(new Date(value));
    return undefined;
  });
  const asap = value === "ASAP";

  const today = startOfDay(now);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + rules.maxDaysAhead);

  const slots = useMemo(() => (date ? generateSlots(date, rules, now) : []), [date, rules, now]);

  const selectedTimeIso = !asap && value ? value : null;

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
            // Clear previous time selection when day changes
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
            // Disable today if no slots remain
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
              ? `Slots on ${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`
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
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => onChange(iso)}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-xs tabular-nums transition",
                      active
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
