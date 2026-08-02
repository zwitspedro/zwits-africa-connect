import { Link } from "@tanstack/react-router";
import { Navigation, MapPin, MessageSquare, Clock } from "lucide-react";
import { LiveTrackingMap } from "@/components/live-tracking-map";
import { STATUS_LABEL, type JobStatus } from "@/lib/job-lifecycle";
import { Panel, EmptyState } from "./dashboard-kit";
import type { Booking } from "./use-provider-data";

/** Turn-by-turn view for the job the provider is currently travelling to. */
export function RouteSection({ jobs }: { jobs: Booking[] }) {
  const current =
    jobs.find((j) => j.status === "travelling") ??
    jobs.find((j) => j.status === "arrived") ??
    jobs.find((j) => j.status === "in_progress") ??
    jobs[0];

  if (!current) {
    return (
      <Panel title="Current route" description="Navigation for your active job.">
        <EmptyState title="No route yet." hint="Accept a job and tap “I'm on my way” to start navigating." />
      </Panel>
    );
  }

  const maps =
    current.lat && current.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${current.lat},${current.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(current.address)}`;

  return (
    <div className="grid gap-4">
      <Panel title="Current route" description={STATUS_LABEL[current.status as JobStatus] ?? current.status}>
        <div className="overflow-hidden rounded-2xl">
          <LiveTrackingMap
            bookingId={current.id}
            destination={current.lat != null && current.lng != null ? { lat: current.lat, lng: current.lng } : null}
          />

        </div>

        <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
            <MapPin className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold capitalize">{current.category}</div>
            <div className="truncate text-xs text-muted-foreground">{current.address}</div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" />
              {current.scheduled_for ? new Date(current.scheduled_for).toLocaleString() : "ASAP"}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={maps}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground"
          >
            <Navigation className="size-4" /> Start navigation
          </a>
          <Link
            to="/messages/$bookingId"
            params={{ bookingId: current.id }}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-border px-5 text-sm font-medium"
          >
            <MessageSquare className="size-4" /> Message customer
          </Link>
        </div>
      </Panel>
    </div>
  );
}
