import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MapPin, Package, Navigation, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { EmptyState } from "@/components/provider/dashboard-kit";
import { TIERS, driverPayout, type ServiceTier } from "@/lib/delivery-config";
import { listMyDeliveryOffers, respondToDeliveryOffer } from "@/lib/delivery.functions";

type Offer = {
  offerId: string;
  expiresAt: string;
  wave: number;
  delivery: {
    id: string;
    pickupAddress: string;
    dropoffAddress: string;
    serviceTier: string;
    parcelSize: string;
    price: number | null;
    distanceKm: number | null;
    notes: string | null;
    recipientName: string | null;
  };
};

function useCountdown(iso: string) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(iso).getTime() - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, new Date(iso).getTime() - Date.now())), 250);
    return () => clearInterval(t);
  }, [iso]);
  return Math.ceil(left / 1000);
}

export function DeliveryOffers({ online }: { online: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchOffers = useServerFn(listMyDeliveryOffers);
  const respond = useServerFn(respondToDeliveryOffer);

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["delivery-offers", user?.id],
    enabled: !!user,
    refetchInterval: 5000,
    queryFn: () => fetchOffers({ data: undefined }) as Promise<Offer[]>,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`delivery-offers:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_offers", filter: `driver_user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["delivery-offers"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const mutation = useMutation({
    mutationFn: (v: { offerId: string; action: "accept" | "decline" }) => respond({ data: v }),
    onSuccess: (res: any, v) => {
      if (v.action === "decline") toast("Declined");
      else if (res?.won) toast.success("Delivery accepted — head to pickup");
      else toast.error(res?.reason ?? "No longer available");
      qc.invalidateQueries({ queryKey: ["delivery-offers"] });
      qc.invalidateQueries({ queryKey: ["driver-deliveries"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not respond"),
  });

  if (isLoading) return <div className="h-24 animate-pulse rounded-2xl bg-muted" />;
  if (offers.length === 0)
    return (
      <EmptyState
        title={online ? "No delivery offers right now" : "You are offline"}
        hint={online ? "Stay online — new parcels are dispatched to the nearest drivers first." : "Go online to join the dispatch queue."}
      />
    );

  return (
    <div className="space-y-3">
      {offers.map((o) => (
        <OfferCard key={o.offerId} offer={o} onRespond={(action) => mutation.mutate({ offerId: o.offerId, action })} busy={mutation.isPending} />
      ))}
    </div>
  );
}

function OfferCard({ offer, onRespond, busy }: { offer: Offer; onRespond: (a: "accept" | "decline") => void; busy: boolean }) {
  const left = useCountdown(offer.expiresAt);
  const tier = TIERS[offer.delivery.serviceTier as ServiceTier];
  if (left <= 0) return null;

  return (
    <article className="overflow-hidden rounded-2xl border border-border/70 bg-card/70 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
        <span className="flex items-center gap-2 text-xs font-medium">
          <Package className="size-3.5 text-primary" />
          {tier?.label ?? offer.delivery.serviceTier}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-primary/12 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
          <Timer className="size-3.5" /> {left}s
        </span>
      </div>

      <div className="space-y-3 p-4">
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-400" />
            <span className="min-w-0 break-words">{offer.delivery.pickupAddress}</span>
          </div>
          <div className="flex gap-2">
            <Navigation className="mt-0.5 size-4 shrink-0 text-gold" />
            <span className="min-w-0 break-words">{offer.delivery.dropoffAddress}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {offer.delivery.distanceKm != null && <span>{offer.delivery.distanceKm} km</span>}
          <span className="capitalize">{offer.delivery.parcelSize} parcel</span>
          <span className="font-semibold text-emerald-400">You earn ${driverPayout(offer.delivery.price).toFixed(2)}</span>
        </div>

        {offer.delivery.notes && <p className="text-xs text-muted-foreground">“{offer.delivery.notes}”</p>}

        <div className="flex gap-2 pt-1">
          <button
            disabled={busy}
            onClick={() => onRespond("decline")}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            Decline
          </button>
          <button
            disabled={busy}
            onClick={() => onRespond("accept")}
            className="flex-[2] rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Accept delivery
          </button>
        </div>
      </div>
    </article>
  );
}
