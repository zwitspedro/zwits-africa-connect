import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Save } from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Panel, EmptyState } from "./dashboard-kit";
import type { Booking } from "./use-provider-data";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STORAGE_KEY = "zwits.provider.availability";

type Availability = {
  hours: Record<string, { on: boolean; from: string; to: string }>;
  leave: string[];
};

const DEFAULT: Availability = {
  hours: Object.fromEntries(DAYS.map((d) => [d, { on: d !== "Sun", from: "08:00", to: "17:00" }])),
  leave: [],
};

export function ScheduleSection({ jobs }: { jobs: Booking[] }) {
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [availability, setAvailability] = useState<Availability>(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAvailability({ ...DEFAULT, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  const upcoming = useMemo(
    () =>
      jobs
        .filter((j) => j.scheduled_for && new Date(j.scheduled_for) >= new Date(Date.now() - 3600_000))
        .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()),
    [jobs],
  );

  const booked = useMemo(
    () => jobs.filter((j) => j.scheduled_for).map((j) => new Date(j.scheduled_for)),
    [jobs],
  );

  const forSelected = selected
    ? upcoming.filter((j) => new Date(j.scheduled_for).toDateString() === selected.toDateString())
    : [];

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(availability));
    toast.success("Availability saved on this device");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
      <Panel title="Calendar" description="Days with bookings are highlighted.">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          modifiers={{ booked }}
          modifiersClassNames={{ booked: "bg-primary/20 text-primary font-semibold rounded-full" }}
          className="pointer-events-auto p-0"
        />
      </Panel>

      <div className="grid gap-4">
        <Panel
          title={selected ? selected.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }) : "Upcoming"}
          action={<CalendarDays className="size-4 text-primary" />}
        >
          {forSelected.length === 0 ? (
            <EmptyState title="Nothing scheduled for this day." />
          ) : (
            <ul className="grid gap-2">
              {forSelected.map((j) => (
                <li key={j.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium tabular-nums">
                      {new Date(j.scheduled_for).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="truncate text-xs text-muted-foreground capitalize">{j.category} — {j.address}</div>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize">{String(j.status).replace("_", " ")}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Upcoming bookings">
          {upcoming.length === 0 ? (
            <EmptyState title="No upcoming bookings." />
          ) : (
            <ul className="grid gap-2">
              {upcoming.slice(0, 8).map((j) => (
                <li key={j.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/40 p-3 text-sm">
                  <span className="truncate capitalize">{j.category} — {j.address}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {new Date(j.scheduled_for).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Working hours & leave"
          description="Recurring weekly availability. Saved on this device for now."
          action={
            <button onClick={save} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground">
              <Save className="size-3.5" /> Save
            </button>
          }
        >
          <div className="grid gap-2">
            {DAYS.map((d) => {
              const row = availability.hours[d] ?? DEFAULT.hours[d];
              return (
                <div key={d} className="grid grid-cols-[3.5rem_auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-2.5">
                  <span className="text-xs font-medium">{d}</span>
                  <button
                    onClick={() =>
                      setAvailability((a) => ({ ...a, hours: { ...a.hours, [d]: { ...row, on: !row.on } } }))
                    }
                    className={`h-6 w-11 shrink-0 rounded-full transition-colors ${row.on ? "bg-primary" : "bg-muted"}`}
                    aria-label={`Toggle ${d}`}
                  >
                    <span className={`block size-5 rounded-full bg-background transition-transform ${row.on ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                  <div className="flex items-center gap-2 justify-self-end">
                    <input
                      type="time"
                      value={row.from}
                      disabled={!row.on}
                      onChange={(e) => setAvailability((a) => ({ ...a, hours: { ...a.hours, [d]: { ...row, from: e.target.value } } }))}
                      className="rounded-lg border border-input bg-background px-2 py-1 text-xs disabled:opacity-40"
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <input
                      type="time"
                      value={row.to}
                      disabled={!row.on}
                      onChange={(e) => setAvailability((a) => ({ ...a, hours: { ...a.hours, [d]: { ...row, to: e.target.value } } }))}
                      className="rounded-lg border border-input bg-background px-2 py-1 text-xs disabled:opacity-40"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <div className="text-xs font-medium">Leave days</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {availability.leave.map((d) => (
                <button
                  key={d}
                  onClick={() => setAvailability((a) => ({ ...a, leave: a.leave.filter((x) => x !== d) }))}
                  className="rounded-full bg-muted px-3 py-1 text-[11px] hover:bg-destructive/20"
                >
                  {new Date(d).toLocaleDateString()} ✕
                </button>
              ))}
              <button
                onClick={() =>
                  selected &&
                  setAvailability((a) =>
                    a.leave.includes(selected.toISOString().slice(0, 10))
                      ? a
                      : { ...a, leave: [...a.leave, selected.toISOString().slice(0, 10)] },
                  )
                }
                className="rounded-full border border-dashed border-border px-3 py-1 text-[11px] text-muted-foreground hover:bg-muted"
              >
                + Mark selected day as leave
              </button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
