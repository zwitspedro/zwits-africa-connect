import { useEffect } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Navigation, Package, Loader2 } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { Panel } from "@/components/provider/dashboard-kit";
import { LiveTrackingMap } from "@/components/live-tracking-map";
import { supabase } from "@/integrations/supabase/client";
import { DELIVERY_FLOW, DELIVERY_STATUS_LABELS, TIERS, type ServiceTier } from "@/lib/delivery-config";
import { advanceDeliveryDispatch } from "@/lib/delivery.functions";

const title = "Track your delivery — Zwits";
const description = "Follow your Zwits courier live from pickup to drop-off with real-time driver location and ETA.";

export const Route = createFileRoute("/_authenticated/deliveries/$id")({
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
  component: DeliveryTrackingPage,
});

function DeliveryTrackingPage() {
  const { id } = useParams({ from: "/_authenticated/deliveries/$id" });
  const qc = useQueryClient();
  const advance = useServerFn(advanceDeliveryDispatch);

  const { data: delivery, isLoading } = useQuery({
    queryKey: ["delivery", id],
    refetchInterval: 8000,
    queryFn: async () => {
      const { data, error } = await supabase.from("deliveries").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`delivery:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "deliveries", filter: `id=eq.${id}` }, () =>
        qc.invalidateQueries({ queryKey: ["delivery", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  const nudge = useMutation({ mutationFn: () => advance({ data: { deliveryId: id } }) });

  // While still searching, keep dispatch moving through the waves.
  useEffect(() => {
    if (!delivery || delivery.status !== "pending" || delivery.dispatch_state === "no_drivers") return;
    const t = setInterval(() => nudge.mutate(), 10000);
    return () => clearInterval(t);
  }, [delivery?.status, delivery?.dispatch_state]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <SiteShell><div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">Loading…</div></SiteShell>;
  if (!delivery)
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 py-16">
          <p className="text-sm text-muted-foreground">Delivery not found.</p>
          <Link to="/dashboard" className="mt-4 inline-block text-sm text-primary">Back to dashboard</Link>
        </div>
      </SiteShell>
    );

  const stepIndex = DELIVERY_FLOW.indexOf(delivery.status as any);
  const dest =
    delivery.status === "picked_up" && delivery.dropoff_lat != null && delivery.dropoff_lng != null
      ? { lat: delivery.dropoff_lat, lng: delivery.dropoff_lng }
      : delivery.pickup_lat != null && delivery.pickup_lng != null
        ? { lat: delivery.pickup_lat, lng: delivery.pickup_lng }
        : null;

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-10 sm:px-6">
        <header>
          <p className="text-sm text-gold">{TIERS[delivery.service_tier as ServiceTier]?.label ?? "Delivery"}</p>
          <h1 className="mt-1 font-display text-3xl font-bold">
            {DELIVERY_STATUS_LABELS[delivery.status] ?? delivery.status}
          </h1>
        </header>

        {delivery.status === "pending" && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 p-4 text-sm">
            {delivery.dispatch_state === "no_drivers" ? (
              <span className="text-muted-foreground">No drivers available right now — we'll keep trying.</span>
            ) : (
              <>
                <Loader2 className="size-4 animate-spin text-primary" />
                <span className="text-muted-foreground">Offering your parcel to nearby drivers…</span>
              </>
            )}
          </div>
        )}

        {(delivery.status === "accepted" || delivery.status === "picked_up") && (
          <LiveTrackingMap bookingId={delivery.id} destination={dest} />
        )}

        <Panel title="Route">
          <ol className="space-y-3">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-400" />
              <span className="text-sm">{delivery.pickup_address}</span>
            </li>
            <li className="flex gap-3">
              <Navigation className="mt-0.5 size-4 shrink-0 text-gold" />
              <span className="text-sm">{delivery.dropoff_address}</span>
            </li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {delivery.distance_km != null && <span>{delivery.distance_km} km</span>}
            <span className="capitalize">{delivery.parcel_size} parcel</span>
            {delivery.price != null && <span className="font-semibold text-foreground">${Number(delivery.price).toFixed(2)}</span>}
          </div>
        </Panel>

        <Panel title="Progress">
          <ol className="space-y-3">
            {DELIVERY_FLOW.map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span
                  className={
                    i <= stepIndex
                      ? "grid size-7 place-items-center rounded-full bg-primary/15 text-primary"
                      : "grid size-7 place-items-center rounded-full bg-muted text-muted-foreground"
                  }
                >
                  <Package className="size-3.5" />
                </span>
                <span className={i <= stepIndex ? "text-sm" : "text-sm text-muted-foreground"}>
                  {DELIVERY_STATUS_LABELS[s]}
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </SiteShell>
  );
}
