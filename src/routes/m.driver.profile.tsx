import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Car, ChevronRight, LogOut, Settings, Star, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDriverData } from "@/components/driver/use-driver-data";
import { clearOfflineCache } from "@/mobile/offline";
import {
  AppBar,
  Card,
  GhostButton,
  Pill,
  Screen,
  Section,
  SkeletonList,
  StatTile,
  money,
} from "@/mobile/ui";

export const Route = createFileRoute("/m/driver/profile")({ component: DriverProfile });

function DriverProfile() {
  const d = useDriverData();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profile: any = d.profile.data;
  const vehicles = d.vehicles.data ?? [];

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    clearOfflineCache();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <>
      <AppBar title="Profile" large />
      <Screen>
        {d.profile.isLoading ? (
          <Section>
            <SkeletonList rows={3} />
          </Section>
        ) : (
          <>
            <Section>
              <Card>
                <div className="flex items-center gap-4">
                  <span className="grid size-16 place-items-center rounded-3xl bg-primary/12 font-display text-xl font-bold text-primary">
                    {(d.userProfile.data?.display_name ?? "D").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold">
                      {d.userProfile.data?.display_name ?? "Driver"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.userProfile.data?.phone ?? "No phone on file"}
                    </p>
                    <div className="mt-2">
                      <Pill
                        tone={profile?.verification_status === "approved" ? "accent" : "warning"}
                      >
                        <BadgeCheck className="size-3" />{" "}
                        {String(profile?.verification_status ?? "pending").replace(/_/g, " ")}
                      </Pill>
                    </div>
                  </div>
                </div>
              </Card>
            </Section>

            <Section title="Performance">
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  label="Rating"
                  value={Number(d.metrics.rating ?? 0).toFixed(1)}
                  icon={Star}
                />
                <StatTile label="Deliveries" value={d.metrics.totalCount} />
                <StatTile
                  label="Total earned"
                  value={money(d.metrics.totalEarnings)}
                  icon={Wallet}
                />
                <StatTile label="Today" value={money(d.metrics.todayEarnings)} />
              </div>
            </Section>

            <Section title="Vehicles">
              {vehicles.length === 0 ? (
                <Card className="text-sm text-muted-foreground">No vehicle registered yet.</Card>
              ) : (
                <div className="grid gap-3">
                  {vehicles.map((v: any) => (
                    <Card key={v.id}>
                      <div className="flex items-center gap-3">
                        <Car className="size-4 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {v.make} {v.model}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {v.plate_number} · {v.vehicle_type}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Account">
              <Card className="divide-y divide-border/60 p-0">
                <Link to="/driver" className="flex min-h-14 items-center gap-3 px-4">
                  <Wallet className="size-4 text-muted-foreground" />
                  <span className="flex-1 text-sm font-medium">Earnings & documents</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
                <Link to="/m/settings" className="flex min-h-14 items-center gap-3 px-4">
                  <Settings className="size-4 text-muted-foreground" />
                  <span className="flex-1 text-sm font-medium">App settings</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </Card>
            </Section>

            <Section>
              <GhostButton onClick={() => void signOut()}>
                <LogOut className="size-4" /> Sign out
              </GhostButton>
            </Section>
          </>
        )}
      </Screen>
    </>
  );
}
