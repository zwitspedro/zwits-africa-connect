import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderData } from "@/components/provider/use-provider-data";
import { statusLabel } from "@/lib/job-lifecycle";
import { AppBar, Card, Empty, Pill, Screen, Section, SkeletonList, money } from "@/mobile/ui";

export const Route = createFileRoute("/m/provider/calendar")({ component: ProviderCalendar });

const DAY_MS = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function ProviderCalendar() {
  const data = useProviderData();
  const [selected, setSelected] = useState(() => dayKey(new Date()));

  const availability = useQuery({
    queryKey: ["m", "availability", data.user?.id],
    enabled: !!data.user?.id,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("provider_availability")
        .select("weekday, start_time, end_time, enabled")
        .eq("user_id", data.user!.id);
      if (error) throw error;
      return rows ?? [];
    },
  });

  const days = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, i) => new Date(+start + i * DAY_MS));
  }, []);

  const jobs = [...(data.active ?? []), ...(data.completed ?? [])] as any[];
  const byDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const j of jobs) {
      const k = dayKey(new Date(j.scheduled_for ?? j.created_at));
      map.set(k, [...(map.get(k) ?? []), j]);
    }
    return map;
  }, [jobs]);

  const selectedJobs = byDay.get(selected) ?? [];
  const weekday = new Date(selected).getDay();
  const slots = (availability.data ?? []).filter((a: any) => a.weekday === weekday && a.enabled);

  return (
    <>
      <AppBar title="Calendar" subtitle="Your next two weeks" />
      <Screen>
        <div className="sticky top-14 z-20 bg-background/95 py-3 backdrop-blur">
          <div className="flex gap-2 overflow-x-auto px-4 pb-1">
            {days.map((d) => {
              const k = dayKey(d);
              const count = (byDay.get(k) ?? []).length;
              const on = k === selected;
              return (
                <button
                  key={k}
                  onClick={() => setSelected(k)}
                  className={`grid min-h-16 w-14 shrink-0 place-items-center rounded-2xl border transition ${
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card"
                  }`}
                >
                  <span className="text-[10px] uppercase opacity-70">
                    {d.toLocaleDateString(undefined, { weekday: "short" })}
                  </span>
                  <span className="text-base font-semibold">{d.getDate()}</span>
                  <span
                    className={`size-1.5 rounded-full ${count ? (on ? "bg-primary-foreground" : "bg-primary") : "bg-transparent"}`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <Section title="Working hours">
          {availability.isLoading ? (
            <SkeletonList rows={1} />
          ) : slots.length === 0 ? (
            <Card className="text-sm text-muted-foreground">No hours set for this weekday.</Card>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((s: any, i) => (
                <Pill key={i} tone="accent">
                  {String(s.start_time).slice(0, 5)} – {String(s.end_time).slice(0, 5)}
                </Pill>
              ))}
            </div>
          )}
        </Section>

        <Section title="Scheduled jobs">
          {data.isLoading ? (
            <SkeletonList rows={2} />
          ) : selectedJobs.length === 0 ? (
            <Empty
              icon={CalendarDays}
              title="Nothing booked"
              hint="Accepted jobs for this day will show here."
            />
          ) : (
            <div className="grid gap-3">
              {selectedJobs.map((j) => (
                <Card key={j.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-primary">
                        {j.category}
                      </p>
                      <p className="truncate text-sm font-semibold">{j.address}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {j.scheduled_for
                          ? new Date(j.scheduled_for).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Flexible"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Pill>{statusLabel(j.status)}</Pill>
                      <p className="mt-1 text-xs font-semibold">{money(j.price)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </Screen>
    </>
  );
}
