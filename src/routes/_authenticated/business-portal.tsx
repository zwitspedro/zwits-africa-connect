import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardList, Users, FileText, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { RoleGate } from "@/components/portal/role-gate";
import { PortalShell } from "@/components/portal/portal-shell";
import { Panel, StatCard, EmptyState, SoonBadge } from "@/components/provider/dashboard-kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/business-portal")({
  head: () => ({
    meta: [
      { title: "Business Portal — Zwits for Companies" },
      { name: "description", content: "Manage company bookings, employee accounts and invoicing from one Zwits business workspace." },
      { property: "og:title", content: "Business Portal — Zwits for Companies" },
      { property: "og:description", content: "Manage company bookings, employee accounts and invoicing from one Zwits business workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BusinessRoute,
});

type Key = "home" | "bookings" | "team" | "invoices" | "settings";

const NAV = [
  { key: "home" as const, label: "Overview", icon: LayoutDashboard },
  { key: "bookings" as const, label: "Bookings", icon: ClipboardList },
  { key: "team" as const, label: "Team", icon: Users },
  { key: "invoices" as const, label: "Invoices", icon: FileText },
  { key: "settings" as const, label: "Settings", icon: Settings },
];

function BusinessRoute() {
  return (
    <RoleGate role="business">
      <BusinessPortal />
    </RoleGate>
  );
}

function BusinessPortal() {
  const [section, setSection] = useState<Key>("home");
  const { user } = useAuth();

  const { data: bookings } = useQuery({
    queryKey: ["business-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, category, status, price, created_at, address")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = bookings ?? [];
  const open = rows.filter((b) => ["pending", "accepted", "in_progress"].includes(b.status)).length;
  const spend = rows.reduce((sum, b) => sum + Number(b.price ?? 0), 0);

  return (
    <PortalShell
      role="business"
      nav={NAV}
      current={section}
      onChange={setSection}
      mobileKeys={["home", "bookings", "team", "invoices"]}
    >
      <div className="space-y-5">
        <header className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold">Business portal</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              One workspace for company bookings, teams and invoicing.
            </p>
          </div>
          <Link
            to="/book/$category"
            params={{ category: "cleaning" }}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            New booking
          </Link>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Open jobs" value={open} />
          <StatCard label="Total bookings" value={rows.length} />
          <StatCard label="Recorded spend" value={`$${spend.toFixed(2)}`} />
          <StatCard label="Team members" value="1" />
        </div>

        {(section === "home" || section === "bookings") && (
          <Panel title="Recent bookings" description="Everything booked on this company account">
            {rows.length === 0 ? (
              <EmptyState title="No bookings yet" hint="Book a service to see it tracked here." />
            ) : (
              <ul className="divide-y divide-border/60">
                {rows.map((b) => (
                  <li key={b.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium capitalize">{b.category}</p>
                      <p className="truncate text-xs text-muted-foreground">{b.address}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] capitalize text-muted-foreground">
                      {b.status.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {section === "team" && (
          <Panel title="Team members" action={<SoonBadge />}>
            <EmptyState title="Employee accounts are coming" hint="Invite staff, set booking limits and approve requests." />
          </Panel>
        )}

        {section === "invoices" && (
          <Panel title="Invoices" action={<SoonBadge />}>
            <EmptyState title="No invoices yet" hint="Monthly consolidated invoicing arrives with Zwits Pay." />
          </Panel>
        )}

        {section === "settings" && (
          <Panel title="Company settings" action={<SoonBadge />}>
            <EmptyState title="Nothing to configure yet" hint="Company profile, billing details and approvals land here." />
          </Panel>
        )}
      </div>
    </PortalShell>
  );
}
