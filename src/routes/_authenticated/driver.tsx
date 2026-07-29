import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LayoutDashboard, Package, Route as RouteIcon, Wallet, Truck, Settings, Power } from "lucide-react";
import { RoleGate } from "@/components/portal/role-gate";
import { PortalShell } from "@/components/portal/portal-shell";
import { Panel, StatCard } from "@/components/provider/dashboard-kit";
import { useDriverData } from "@/components/driver/use-driver-data";
import { DeliveryOffers } from "@/components/driver/delivery-offers";
import { ActiveDelivery } from "@/components/driver/active-delivery";
import { DriverEarnings } from "@/components/driver/driver-earnings";
import { VehicleSection } from "@/components/driver/vehicle-section";
import { DriverSettings } from "@/components/driver/driver-settings";
import { supabase } from "@/integrations/supabase/client";

const title = "Driver Portal — Zwits Deliveries";
const description = "Accept delivery jobs, follow optimised routes and track your Zwits driver earnings.";

export const Route = createFileRoute("/_authenticated/driver")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DriverRoute,
});

type Key = "home" | "jobs" | "route" | "earnings" | "vehicle" | "settings";

const NAV = [
  { key: "home" as const, label: "Home", icon: LayoutDashboard },
  { key: "jobs" as const, label: "Deliveries", icon: Package },
  { key: "route" as const, label: "Route", icon: RouteIcon },
  { key: "earnings" as const, label: "Earnings", icon: Wallet },
  { key: "vehicle" as const, label: "Vehicle", icon: Truck },
  { key: "settings" as const, label: "Settings", icon: Settings },
];

function DriverRoute() {
  return (
    <RoleGate role="driver">
      <DriverPortal />
    </RoleGate>
  );
}

function DriverPortal() {
  const [section, setSection] = useState<Key>("home");
  const qc = useQueryClient();
  const { user, profile, vehicles, active, completed, metrics } = useDriverData();
  const online = !!profile.data?.available;

  const toggleOnline = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase
        .from("driver_profiles")
        .upsert({ user_id: user!.id, available: next }, { onConflict: "user_id" });
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      toast.success(next ? "You are online" : "You are offline");
      qc.invalidateQueries({ queryKey: ["driver-profile"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update availability"),
  });

  return (
    <PortalShell role="driver" nav={NAV} current={section} onChange={setSection} mobileKeys={["home", "jobs", "route", "earnings"]}>
      <div className="space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Driver portal</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {online ? "You are online — offers are being dispatched to you." : "You are offline. Go online to receive deliveries."}
            </p>
          </div>
          <button
            disabled={toggleOnline.isPending || !user}
            onClick={() => toggleOnline.mutate(!online)}
            className={
              online
                ? "inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-400 ring-1 ring-emerald-500/30"
                : "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            }
          >
            <Power className="size-4" />
            {online ? "Online" : "Go online"}
          </button>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Deliveries today" value={metrics.todayCount} />
          <StatCard label="Distance" value={`${metrics.todayKm} km`} />
          <StatCard label="Today's earnings" value={`$${metrics.todayEarnings.toFixed(2)}`} accent="positive" />
          <StatCard label="Rating" value={metrics.rating ? Number(metrics.rating).toFixed(1) : "—"} accent="gold" />
        </div>

        {section === "home" && (
          <div className="space-y-4">
            {active.length > 0 && <ActiveDelivery active={active} />}
            <Panel title="Live offers" description="Respond before the timer runs out">
              <DeliveryOffers online={online} />
            </Panel>
            {vehicles.data?.length === 0 && (
              <Panel title="Getting started" description="Complete these to start receiving delivery offers">
                <ol className="space-y-3 text-sm">
                  {[
                    "Add your vehicle details and licence plate",
                    "Fill in your driver profile and delivery zone",
                    "Turn on availability to join the dispatch queue",
                  ].map((s, i) => (
                    <li key={s} className="flex items-start gap-3">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{s}</span>
                    </li>
                  ))}
                </ol>
              </Panel>
            )}
          </div>
        )}

        {section === "jobs" && (
          <Panel title="Delivery offers" description="Live dispatch from nearby customers">
            <DeliveryOffers online={online} />
          </Panel>
        )}

        {section === "route" && <ActiveDelivery active={active} />}

        {section === "earnings" && <DriverEarnings completed={completed} metrics={metrics} />}

        {section === "vehicle" && user && <VehicleSection userId={user.id} vehicles={vehicles.data ?? []} />}

        {section === "settings" && user && <DriverSettings userId={user.id} profile={profile.data} />}
      </div>
    </PortalShell>
  );
}
