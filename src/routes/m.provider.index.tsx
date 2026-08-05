import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Bell, Briefcase, ShieldAlert, Star, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProviderData } from "@/components/provider/use-provider-data";
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
  when,
} from "@/mobile/ui";
import { statusLabel } from "@/lib/job-lifecycle";

export const Route = createFileRoute("/m/provider/")({ component: ProviderDashboard });

function ProviderDashboard() {
  const { user } = useAuth();
  const data = useProviderData();
  const unread = useUnreadCount(user?.id);
  const qc = useQueryClient();

  const provider = data.provider as any;
  const today = (data.active ?? []).filter((j: any) => {
    const d = new Date(j.scheduled_for ?? j.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const toggleOnline = useMutation({
    mutationFn: async (available: boolean) => {
      const { error } = await supabase
        .from("providers")
        .update({ available })
        .eq("id", provider.id);
      if (error) throw error;
      return available;
    },
    onSuccess: (v) => {
      toast.success(v ? "You're online — new jobs will reach you" : "You're offline");
      void qc.invalidateQueries({ queryKey: ["provider"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not change your status"),
  });

  if (data.isLoading) {
    return (
      <>
        <AppBar title="Dashboard" />
        <Screen>
          <Section>
            <SkeletonList rows={4} />
          </Section>
        </Screen>
      </>
    );
  }

  if (!provider) {
    return (
      <>
        <AppBar title="Dashboard" />
        <Screen>
          <Section>
            <Empty
              icon={ShieldAlert}
              title="Finish setting up your business"
              hint="Complete provider setup to start receiving jobs."
              action={
                <Link
                  to="/provider/setup"
                  className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
                >
                  Continue setup
                </Link>
              }
            />
          </Section>
        </Screen>
      </>
    );
  }

  return (
    <>
      <AppBar
        large
        title={provider.business_name}
        subtitle={`${provider.category} · ${provider.city}`}
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
                    {provider.available ? "You're online" : "You're offline"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {provider.available
                      ? "Receiving job offers in your area"
                      : "No new offers while offline"}
                  </p>
                </div>
                <button
                  aria-label="Toggle online"
                  onClick={() => toggleOnline.mutate(!provider.available)}
                  className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${provider.available ? "bg-accent" : "bg-muted"}`}
                >
                  <span
                    className={`absolute top-1 size-6 rounded-full bg-background transition-all ${provider.available ? "left-7" : "left-1"}`}
                  />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill tone={provider.verification_status === "approved" ? "accent" : "warning"}>
                  <BadgeCheck className="size-3" />{" "}
                  {String(provider.verification_status).replace(/_/g, " ")}
                </Pill>
                <Pill tone={data.onboarding.ready ? "accent" : "warning"}>
                  Profile{" "}
                  {Math.round(
                    (data.onboarding.completed / Math.max(1, data.onboarding.total)) * 100,
                  )}
                  %
                </Pill>
              </div>
            </Card>
          </Section>

          <Section title="Your numbers">
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Today's jobs" value={today.length} icon={Briefcase} />
              <StatTile label="This week" value={money(data.earnings.week)} icon={TrendingUp} />
              <StatTile label="This month" value={money(data.earnings.month)} icon={Wallet} />
              <StatTile
                label="Rating"
                value={Number(provider.rating_avg ?? 0).toFixed(1)}
                hint={`${provider.ratings_count ?? 0} reviews`}
                icon={Star}
              />
              <StatTile label="Jobs completed" value={provider.jobs_completed ?? 0} />
              <StatTile label="Pending payout" value={money(data.earnings.pending)} />
            </div>
          </Section>

          <Section
            title="Today"
            action={
              <Link to="/m/provider/jobs" className="text-xs text-primary">
                All jobs
              </Link>
            }
          >
            {today.length === 0 ? (
              <Empty
                icon={Briefcase}
                title="Nothing scheduled today"
                hint="New offers appear in the Jobs tab."
              />
            ) : (
              <div className="grid gap-3">
                {today.map((j: any) => (
                  <Link key={j.id} to="/m/provider/jobs/$id" params={{ id: j.id }}>
                    <Card>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-wider text-primary">
                            {j.category}
                          </p>
                          <p className="truncate text-sm font-semibold">{j.address}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {when(j.scheduled_for)}
                          </p>
                        </div>
                        <Pill tone="primary">{statusLabel(j.status)}</Pill>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <Section title="Recent reviews">
            {(data.reviews ?? []).length === 0 ? (
              <Empty
                icon={Star}
                title="No reviews yet"
                hint="Great work earns 5-star reviews here."
              />
            ) : (
              <div className="grid gap-3">
                {(data.reviews ?? []).slice(0, 4).map((r: any) => (
                  <Card key={r.id}>
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`size-3.5 ${i < r.rating ? "fill-current" : "opacity-30"}`}
                        />
                      ))}
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {r.review && <p className="mt-2 text-sm text-muted-foreground">{r.review}</p>}
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
