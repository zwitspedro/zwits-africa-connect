import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppBar, Card, Empty, PullToRefresh, Screen, Section, SkeletonList } from "@/mobile/ui";

export const Route = createFileRoute("/m/driver/messages")({ component: DriverMessages });

/** Drivers chat per delivery — threads come from the deliveries assigned to them. */
function DriverMessages() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const threads = useQuery({
    queryKey: ["m", "driver-threads", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("id, pickup_address, dropoff_address, status, created_at")
        .eq("driver_id", user!.id)
        .in("status", ["accepted", "picked_up"])
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <>
      <AppBar title="Messages" subtitle="Chat about your live runs" />
      <Screen>
        <PullToRefresh onRefresh={() => threads.refetch()}>
          <Section>
            {threads.isLoading ? (
              <SkeletonList rows={3} />
            ) : (threads.data ?? []).length === 0 ? (
              <Empty
                icon={MessageSquare}
                title="No conversations"
                hint="Chats open while a delivery is in progress."
              />
            ) : (
              <div className="grid gap-3">
                {(threads.data ?? []).map((t) => (
                  <Card
                    key={t.id}
                    onClick={() =>
                      navigate({ to: "/m/chat/$bookingId", params: { bookingId: t.id } })
                    }
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
                        <MessageSquare className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{t.pickup_address}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          → {t.dropoff_address}
                        </p>
                      </div>
                      <p className="shrink-0 text-[10px] text-muted-foreground">
                        {String(t.status).replace(/_/g, " ")}
                      </p>
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
