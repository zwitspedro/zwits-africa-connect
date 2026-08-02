import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, MessageSquare, Phone, Navigation, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProviderJobsMap } from "@/components/provider-jobs-map";
import { LIFECYCLE, NEXT_ACTION, STATUS_LABEL, stageIndex, type JobStatus } from "@/lib/job-lifecycle";
import { EmptyState, Panel } from "./dashboard-kit";
import type { Booking } from "./use-provider-data";

const TIMELINE = LIFECYCLE.filter((s) => s !== "pending").map((s) => ({ key: s, label: STATUS_LABEL[s] }));

export function ActiveJobsSection({ jobs }: { jobs: Booking[] }) {
  const qc = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: Record<string, unknown> = { status };
      if (status === "completed") patch.completed_at = new Date().toISOString();
      const { error } = await supabase.from("bookings").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job updated");
      qc.invalidateQueries({ queryKey: ["provider-jobs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update"),
  });


  return (
    <div className="grid gap-4">
      <Panel title="Live job map" description="Tap a marker to open job details and navigation.">
        <ProviderJobsMap jobs={jobs} />
      </Panel>

      {jobs.length === 0 && <EmptyState title="No active jobs right now." hint="Accepted jobs appear here with navigation and chat." />}

      {jobs.map((j) => {
        const stepIndex = stageIndex(j.status) - 1;
        const action = NEXT_ACTION[j.status as JobStatus];
        const maps = j.lat && j.lng
          ? `https://www.google.com/maps/dir/?api=1&destination=${j.lat},${j.lng}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(j.address)}`;
        return (
          <Panel key={j.id} className="p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-primary">{j.category}</div>
                <h3 className="mt-1 truncate font-display text-lg font-semibold">{j.address}</h3>
                {j.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{j.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {j.scheduled_for ? new Date(j.scheduled_for).toLocaleString() : "ASAP"}
                  </span>
                  {j.price != null && <span>${Number(j.price).toFixed(2)}</span>}
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-[11px] capitalize">{String(j.status).replace("_", " ")}</span>
            </div>

            {/* Status timeline */}
            <ol className="mt-5 flex items-center gap-1">
              {TIMELINE.map((s, i) => (
                <li key={s.key} className="flex flex-1 items-center gap-1">
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold transition-colors ${
                      i <= stepIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i <= stepIndex ? <CheckCircle2 className="size-3.5" /> : i + 1}
                  </span>
                  <span className="hidden truncate text-[11px] text-muted-foreground sm:block">{s.label}</span>
                  {i < TIMELINE.length - 1 && (
                    <span className={`h-0.5 flex-1 rounded-full ${i < stepIndex ? "bg-primary" : "bg-muted"}`} />
                  )}
                </li>
              ))}
            </ol>

            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={maps}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium transition-colors hover:bg-muted"
              >
                <Navigation className="size-3.5" /> Navigate
              </a>
              <Link
                to="/messages/$bookingId"
                params={{ bookingId: j.id }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium transition-colors hover:bg-muted"
              >
                <MessageSquare className="size-3.5" /> Chat
              </Link>
              <a
                href="tel:"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium transition-colors hover:bg-muted"
                onClick={(e) => {
                  e.preventDefault();
                  toast("Open the chat to request the customer's number.");
                }}
              >
                <Phone className="size-3.5" /> Call
              </a>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {j.status === "pending" && (
                <ActionButton onClick={() => updateStatus.mutate({ id: j.id, status: "accepted" })}>Accept job</ActionButton>
              )}
              {(j.status === "travelling" || j.status === "in_progress") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-2 text-[11px] text-primary">
                  <MapPin className="size-3" /> Sharing live location
                </span>
              )}
              {action && (
                <ActionButton
                  variant={action.next === "completed" ? "positive" : "primary"}
                  onClick={() => updateStatus.mutate({ id: j.id, status: action.next })}
                >
                  {action.label}
                </ActionButton>
              )}
            </div>

          </Panel>
        );
      })}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "gold" | "positive" | "ghost";
}) {
  const styles: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:brightness-110",
    gold: "bg-gold text-background hover:brightness-110",
    positive: "bg-emerald-500 text-background hover:brightness-110",
    ghost: "border border-border text-muted-foreground",
  };
  return (
    <button
      onClick={onClick}
      className={`min-h-11 rounded-full px-5 text-xs font-semibold transition-all active:scale-[0.98] ${styles[variant]}`}
    >
      {children}
    </button>
  );
}
