import { CheckCircle2 } from "lucide-react";
import { Panel, EmptyState } from "./dashboard-kit";
import type { ProviderData } from "./use-provider-data";

export function CompletedJobsSection({ data }: { data: ProviderData }) {
  const { completed, netFor } = data;
  return (
    <Panel title="Completed jobs" description={`${completed.length} job(s) finished`}>
      {completed.length === 0 ? (
        <EmptyState title="No completed jobs yet." hint="Finished jobs and their payouts appear here." />
      ) : (
        <ul className="grid gap-2">
          {completed.slice(0, 40).map((j: any) => (
            <li
              key={j.id}
              className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-3"
            >
              <span className="grid size-10 place-items-center rounded-full bg-emerald-500/12 text-emerald-500">
                <CheckCircle2 className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium capitalize">{j.category}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{j.address}</span>
              </span>
              <span className="text-right">
                <span className="block text-sm font-semibold tabular-nums text-emerald-500">
                  ${netFor(j).toFixed(2)}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {new Date(j.completed_at ?? j.updated_at ?? j.created_at).toLocaleDateString()}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
