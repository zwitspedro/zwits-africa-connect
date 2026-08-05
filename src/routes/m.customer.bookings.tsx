import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { qk } from "@/mobile/api";
import { isOpen, statusLabel } from "@/lib/job-lifecycle";
import {
  AppBar,
  Card,
  Empty,
  Fab,
  Pill,
  PullToRefresh,
  Screen,
  Section,
  SkeletonList,
  money,
  when,
} from "@/mobile/ui";

export const Route = createFileRoute("/m/customer/bookings")({ component: BookingsScreen });

type Tab = "active" | "history";

function BookingsScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("active");

  const bookings = useQuery({
    queryKey: qk.bookings(user?.id ?? ""),
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const deliveries = useQuery({
    queryKey: qk.deliveries(user?.id ?? ""),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("*")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = (bookings.data ?? []).filter((b: any) =>
    tab === "active" ? isOpen(b.status) : !isOpen(b.status),
  );
  const parcels = (deliveries.data ?? []).filter((d: any) =>
    tab === "active"
      ? !["delivered", "cancelled"].includes(d.status)
      : ["delivered", "cancelled"].includes(d.status),
  );

  return (
    <>
      <AppBar title="Bookings" subtitle="Services and deliveries" />
      <Screen>
        <div className="sticky top-14 z-20 bg-background/95 px-4 py-3 backdrop-blur">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
            {(["active", "history"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`min-h-10 rounded-xl text-xs font-semibold capitalize transition ${
                  tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <PullToRefresh
          onRefresh={async () =>
            void (await Promise.all([bookings.refetch(), deliveries.refetch()]))
          }
        >
          <Section>
            {bookings.isLoading ? (
              <SkeletonList rows={4} />
            ) : rows.length === 0 && parcels.length === 0 ? (
              <Empty
                icon={CalendarCheck}
                title={tab === "active" ? "No active bookings" : "Nothing in your history yet"}
                hint="Book a service and it will appear here with live tracking."
              />
            ) : (
              <div className="grid gap-3">
                {rows.map((b: any) => (
                  <Card
                    key={b.id}
                    onClick={() => navigate({ to: "/m/customer/track/$id", params: { id: b.id } })}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wider text-primary">
                          {b.category}
                        </p>
                        <p className="truncate text-sm font-semibold">{b.address}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {when(b.scheduled_for)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Pill tone={isOpen(b.status) ? "primary" : "muted"}>
                          {statusLabel(b.status)}
                        </Pill>
                        {b.price != null && (
                          <p className="mt-1 text-xs font-semibold">{money(b.price)}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}

                {parcels.map((d: any) => (
                  <Card key={d.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wider text-accent">
                          Delivery · {d.service_tier}
                        </p>
                        <p className="truncate text-sm font-semibold">{d.dropoff_address}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          from {d.pickup_address}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Pill tone="accent">{String(d.status).replace(/_/g, " ")}</Pill>
                        {d.price != null && (
                          <p className="mt-1 text-xs font-semibold">{money(d.price)}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Section>
        </PullToRefresh>
      </Screen>
      <Fab icon={Plus} label="Book" to="/m/customer/categories" />
    </>
  );
}
