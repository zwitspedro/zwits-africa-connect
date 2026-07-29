import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel, EmptyState } from "./dashboard-kit";

export function NotificationsSection({ notifications }: { notifications: any[] }) {
  const qc = useQueryClient();
  const markAll = useMutation({
    mutationFn: async () => {
      const ids = notifications.filter((n) => !n.read_at).map((n) => n.id);
      if (!ids.length) return;
      const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider-notifications"] }),
  });

  return (
    <Panel
      title="Notifications"
      description="Job alerts, payments, messages and platform updates."
      action={
        <button
          onClick={() => markAll.mutate()}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-4 text-xs font-medium hover:bg-muted"
        >
          <CheckCheck className="size-3.5" /> Mark all read
        </button>
      }
    >
      {notifications.length === 0 ? (
        <EmptyState title="No notifications yet." />
      ) : (
        <ul className="grid gap-2">
          {notifications.map((n) => {
            const body = (
              <>
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-primary"}`} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{n.title}</div>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              </>
            );
            const cls =
              "flex items-start gap-3 rounded-2xl border border-border/70 bg-background/40 p-3 transition-colors hover:border-primary/40";
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link to={n.link} className={cls}>
                    {body}
                  </Link>
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Bell className="size-3" /> Install the Zwits app to receive push alerts for new jobs.
      </p>
    </Panel>
  );
}
