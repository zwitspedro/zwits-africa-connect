import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Package, Timer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { listMyDeliveryOffers, respondToDeliveryOffer } from "@/lib/delivery.functions";
import { useDriverData } from "@/components/driver/use-driver-data";
import {
  AppBar,
  Card,
  Empty,
  GhostButton,
  Pill,
  PrimaryButton,
  PullToRefresh,
  Screen,
  Section,
  SkeletonList,
  money,
} from "@/mobile/ui";

export const Route = createFileRoute("/m/driver/deliveries")({ component: DriverDeliveries });

type Tab = "offers" | "active" | "history";

function DriverDeliveries() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const d = useDriverData();
  const [tab, setTab] = useState<Tab>("offers");
  const fetchOffers = useServerFn(listMyDeliveryOffers);

  const offers = useQuery({
    queryKey: ["delivery-offers", user?.id],
    enabled: !!user,
    refetchInterval: 5000,
    queryFn: () => fetchOffers({}) as Promise<any[]>,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`mobile-delivery-offers:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_offers",
          filter: `driver_user_id=eq.${user.id}`,
        },
        () => void qc.invalidateQueries({ queryKey: ["delivery-offers", user.id] }),
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [user, qc]);

  const tabs: { key: Tab; label: string }[] = [
    {
      key: "offers",
      label: `Offers${(offers.data ?? []).length ? ` (${(offers.data ?? []).length})` : ""}`,
    },
    { key: "active", label: "Active" },
    { key: "history", label: "History" },
  ];

  return (
    <>
      <AppBar title="Deliveries" subtitle="Offers, runs and history" />
      <Screen>
        <div className="sticky top-14 z-20 bg-background/95 px-4 py-3 backdrop-blur">
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`min-h-10 rounded-xl text-xs font-semibold transition ${
                  tab === t.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <PullToRefresh
          onRefresh={async () =>
            void (await Promise.all([offers.refetch(), d.deliveries.refetch()]))
          }
        >
          <Section>
            {tab === "offers" ? (
              offers.isLoading ? (
                <SkeletonList rows={2} />
              ) : (offers.data ?? []).length === 0 ? (
                <Empty
                  icon={Package}
                  title="No offers right now"
                  hint="Stay online — new parcels are dispatched to nearby drivers."
                />
              ) : (
                <div className="grid gap-3">
                  {(offers.data ?? []).map((o) => (
                    <OfferCard key={o.offerId} offer={o} />
                  ))}
                </div>
              )
            ) : d.deliveries.isLoading ? (
              <SkeletonList rows={3} />
            ) : (
              <DeliveryList rows={tab === "active" ? d.active : d.completed} />
            )}
          </Section>
        </PullToRefresh>
      </Screen>
    </>
  );
}

function DeliveryList({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <Empty icon={Package} title="Nothing here yet" />;
  return (
    <div className="grid gap-3">
      {rows.map((r) => (
        <Link key={r.id} to="/m/driver/deliveries/$id" params={{ id: r.id }}>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{r.pickup_address}</p>
                <p className="truncate text-xs text-muted-foreground">→ {r.dropoff_address}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {r.service_tier} · {r.distance_km ?? "—"} km
                </p>
              </div>
              <div className="shrink-0 text-right">
                <Pill tone={r.status === "delivered" ? "accent" : "primary"}>
                  {String(r.status).replace(/_/g, " ")}
                </Pill>
                <p className="mt-1 text-xs font-semibold">{money(r.price)}</p>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function OfferCard({ offer }: { offer: any }) {
  const qc = useQueryClient();
  const respond = useServerFn(respondToDeliveryOffer);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [left, setLeft] = useState(() =>
    Math.max(0, Math.floor((+new Date(offer.expiresAt) - Date.now()) / 1000)),
  );

  useEffect(() => {
    const t = setInterval(
      () => setLeft(Math.max(0, Math.floor((+new Date(offer.expiresAt) - Date.now()) / 1000))),
      1000,
    );
    return () => clearInterval(t);
  }, [offer.expiresAt]);

  const act = async (action: "accept" | "decline") => {
    setBusy(action);
    try {
      const res: any = await respond({ data: { offerId: offer.offerId, action } });
      toast[action === "accept" && res?.won === false ? "info" : "success"](
        action === "decline"
          ? "Offer declined"
          : res?.won === false
            ? "Another driver got there first"
            : "Delivery accepted",
      );
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not respond");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-primary">
            {offer.delivery.serviceTier} · {offer.delivery.parcelSize}
          </p>
          <p className="truncate text-sm font-semibold">{offer.delivery.pickupAddress}</p>
          <p className="truncate text-xs text-muted-foreground">
            → {offer.delivery.dropoffAddress}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {offer.delivery.distanceKm ?? "—"} km
          </p>
        </div>
        <div className="shrink-0 text-right">
          <Pill tone={left > 20 ? "primary" : "danger"}>
            <Timer className="size-3" /> {left}s
          </Pill>
          <p className="mt-1 text-sm font-semibold">{money(offer.delivery.price)}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <GhostButton onClick={() => void act("decline")}>
          {busy === "decline" ? "…" : "Decline"}
        </GhostButton>
        <PrimaryButton loading={busy === "accept"} onClick={() => void act("accept")}>
          Accept
        </PrimaryButton>
      </div>
    </Card>
  );
}
