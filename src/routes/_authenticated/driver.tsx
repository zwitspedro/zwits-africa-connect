import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard, Package, Route as RouteIcon, Wallet, Truck, Settings } from "lucide-react";
import { RoleGate } from "@/components/portal/role-gate";
import { PortalShell } from "@/components/portal/portal-shell";
import { Panel, StatCard, EmptyState, SoonBadge } from "@/components/provider/dashboard-kit";

export const Route = createFileRoute("/_authenticated/driver")({
  head: () => ({
    meta: [
      { title: "Driver Portal — Zwits Deliveries" },
      { name: "description", content: "Accept delivery jobs, follow optimised routes and track your Zwits driver earnings." },
      { property: "og:title", content: "Driver Portal — Zwits Deliveries" },
      { property: "og:description", content: "Accept delivery jobs, follow optimised routes and track your Zwits driver earnings." },
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

  return (
    <PortalShell
      role="driver"
      nav={NAV}
      current={section}
      onChange={setSection}
      mobileKeys={["home", "jobs", "route", "earnings"]}
    >
      <div className="space-y-5">
        <header>
          <h1 className="font-display text-2xl font-bold">Driver portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your delivery command center. Live dispatch goes live with the Zwits Deliveries rollout.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Deliveries today" value="0" />
          <StatCard label="Distance" value="0 km" />
          <StatCard label="Today's earnings" value="$0" />
          <StatCard label="Acceptance" value="—" />
        </div>

        {section === "home" && (
          <Panel title="Getting started" description="Complete these to start receiving delivery offers">
            <ol className="space-y-3 text-sm">
              {[
                "Add your vehicle details and licence plate",
                "Upload your driver's licence and ID",
                "Set your delivery zone and working hours",
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

        {section === "jobs" && (
          <Panel title="Delivery offers" action={<SoonBadge />}>
            <EmptyState title="No delivery offers yet" hint="Offers appear here once Zwits Deliveries launches in your city." />
          </Panel>
        )}

        {section === "route" && (
          <Panel title="Active route" action={<SoonBadge />}>
            <EmptyState title="No active route" hint="Accepted deliveries build a turn-by-turn route here." />
          </Panel>
        )}

        {section === "earnings" && (
          <Panel title="Earnings" action={<SoonBadge />}>
            <EmptyState title="No earnings yet" hint="Per-delivery payouts and weekly summaries will show here." />
          </Panel>
        )}

        {section === "vehicle" && (
          <Panel title="Vehicle & documents" action={<SoonBadge />}>
            <EmptyState title="No vehicle on file" hint="Vehicle registration and licence uploads arrive with driver onboarding." />
          </Panel>
        )}

        {section === "settings" && (
          <Panel title="Driver settings" action={<SoonBadge />}>
            <EmptyState title="Nothing to configure yet" hint="Zones, availability and payout preferences land here." />
          </Panel>
        )}
      </div>
    </PortalShell>
  );
}
