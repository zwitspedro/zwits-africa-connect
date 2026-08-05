import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Gauge, Package, Route as RouteIcon, Star, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDriverData } from "@/components/driver/use-driver-data";
import { useUnreadCount } from "@/mobile/notifications";
import {
  AppBar,
  Card,
  Empty,
  Pill,
  PullToRefresh,
  Screen,
  Section,
  SkeletonList,
  StatTile,
  money,
} from "@/mobile/ui";

export const Route = createFileRoute("/m/driver/")({ component: DriverDashboard });

function DriverDashboard() {
  const d = useDriverData();
  const qc = useQueryClient();
  const unread = useUnreadCount(d.user?.id);
  const profile: any = d.profile.data;

  const toggleOnline = useMutation({
    mutationFn: async (online: boolean) => {
      const { error } = await supabase
        .from("driver_profiles")
        .update({ available: online })
        .eq("user_id", d.user!.id);
      if (error) throw error;
      return online;
    },
    onSuccess: (v) => {
      toast.success(v ? "You're online — offers will come through" : "You're offline");
      void qc.invalidateQueries({ queryKey: ["driver-profile"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not change your status"),
  });

  return (
    <>
      <AppBar
        large
        title={d.userProfile.data?.display_name ?? "Driver"}
        subtitle={
          profile?.verification_status
            ? String(profile.verification_status).replace(/_/g, " ")
            : "Zwits delivery"
        }
        right={
          <Link
            to="/m/notifications"
            aria-label="Notifications"
            className="relative grid size-11 place-items-center rounded-full active:bg-muted"
          >
            <Bell className="size-5" />
            {!!unread && (
              <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />
            )}
          </Link>
        }
      />
      <Screen>
        <PullToRefresh onRefresh={async () => void (await qc.invalidateQueries())}>
          <Section>
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">
                    {profile?.available ? "You're online" : "You're offline"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.available
                      ? "Receiving delivery offers nearby"
                      : "Go online to receive offers"}
                  </p>
                </div>
                <button
                  aria-label="Toggle online"
                  onClick={() => toggleOnline.mutate(!profile?.available)}
                  className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${profile?.available ? "bg-accent" : "bg-muted"}`}
                >
                  <span
                    className={`absolute top-1 size-6 rounded-full bg-background transition-all ${profile?.available ? "left-7" : "left-1"}`}
                  />
                </button>
              </div>
            </Card>
          </Section>

          <Section title="Today">
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Deliveries" value={d.metrics.todayCount} icon={Package} />
              <StatTile label="Earnings" value={money(d.metrics.todayEarnings)} icon={Wallet} />
              <StatTile label="Distance" value={`${d.metrics.todayKm} km`} icon={RouteIcon} />
              <StatTile
                label="Rating"
                value={Number(d.metrics.rating ?? 0).toFixed(1)}
                icon={Star}
              />
            </div>
          </Section>

          <Section title="Lifetime">
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Total earned" value={money(d.metrics.totalEarnings)} icon={Wallet} />
              <StatTile label="Completed" value={d.metrics.totalCount} icon={Gauge} />
            </div>
          </Section>

          <Section
            title="Active runs"
            action={
              <Link to="/m/driver/deliveries" className="text-xs text-primary">
                All
              </Link>
            }
          >
            {d.deliveries.isLoading ? (
              <SkeletonList rows={2} />
            ) : d.active.length === 0 ? (
              <Empty
                icon={Package}
                title="No active delivery"
                hint="Offers appear in the Deliveries tab while you're online."
              />
            ) : (
              <div className="grid gap-3">
                {d.active.map((r) => (
                  <Link key={r.id} to="/m/driver/deliveries/$id" params={{ id: r.id }}>
                    <Card>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{r.pickup_address}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            → {r.dropoff_address}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <Pill tone="primary">{r.status.replace(/_/g, " ")}</Pill>
                          <p className="mt-1 text-xs font-semibold">{money(r.price)}</p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </Section>
        </PullToRefresh>
      </Screen>
    </>
  );
}
