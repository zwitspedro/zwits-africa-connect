import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { qk } from "@/mobile/api";
import { AppBar, Card, Empty, PullToRefresh, Screen, Section, SkeletonList } from "@/mobile/ui";

export const Route = createFileRoute("/m/notifications")({ component: NotificationsScreen });

function NotificationsScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const notifications = useQuery({
    queryKey: qk.notifications(user?.id ?? ""),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    void qc.invalidateQueries({ queryKey: qk.notifications(user?.id ?? "") });
  };

  return (
    <>
      <AppBar title="Notifications" back />
      <Screen>
        <PullToRefresh onRefresh={() => notifications.refetch()}>
          <Section>
            {notifications.isLoading ? (
              <SkeletonList rows={4} />
            ) : (notifications.data ?? []).length === 0 ? (
              <Empty
                icon={Bell}
                title="You're all caught up"
                hint="Job, delivery and payment updates land here."
              />
            ) : (
              <div className="grid gap-3">
                {(notifications.data ?? []).map((n: any) => (
                  <Card
                    key={n.id}
                    onClick={() => void markRead(n.id)}
                    className={n.read_at ? "opacity-70" : ""}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 size-2 shrink-0 rounded-full ${n.read_at ? "bg-muted-foreground/40" : "bg-primary"}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{n.title}</p>
                        {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Section>
        </PullToRefresh>
      </Screen>
    </>
  );
}
