import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Zwits" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <SiteShell>
      <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">Notifications</h1>
          <button
            onClick={() => markAll.mutate()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"
          >
            <CheckCheck className="size-3.5" /> Mark all read
          </button>
        </div>

        <div className="mt-6 grid gap-2">
          {items?.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              <Bell className="mx-auto mb-2 size-6 opacity-50" />
              No notifications yet.
            </div>
          )}
          {items?.map((n) => (
            <div
              key={n.id}
              className={`flex gap-3 rounded-2xl border p-4 ${
                n.read_at ? "border-border bg-card" : "border-primary/40 bg-primary/5"
              }`}
            >
              <div
                className={`mt-1 size-2 shrink-0 rounded-full ${
                  n.read_at ? "bg-muted-foreground/30" : "bg-primary"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                {n.body && (
                  <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                    {n.body}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3">
                  {n.link && (
                    <Link
                      to={n.link}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View →
                    </Link>
                  )}
                  <button
                    onClick={() => remove.mutate(n.id)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="size-3" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
