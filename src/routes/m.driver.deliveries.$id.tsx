import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, MessageSquare, Navigation, Package, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { updateDeliveryStatus } from "@/lib/delivery.functions";
import { openNavigation } from "@/mobile/maps";
import { captureAndUpload } from "@/mobile/media";
import {
  AppBar,
  Card,
  GhostButton,
  Pill,
  PrimaryButton,
  Screen,
  Section,
  SkeletonList,
  money,
} from "@/mobile/ui";

export const Route = createFileRoute("/m/driver/deliveries/$id")({ component: DeliveryDetail });

function DeliveryDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const update = useServerFn(updateDeliveryStatus);
  const [busy, setBusy] = useState(false);
  const [proof, setProof] = useState<string | null>(null);

  const delivery = useQuery({
    queryKey: ["m", "delivery", id],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const d = delivery.data;

  const advance = async (status: "picked_up" | "delivered") => {
    setBusy(true);
    try {
      await update({
        data: { deliveryId: id, status, proofPhotoUrl: status === "delivered" ? proof : null },
      });
      toast.success(status === "picked_up" ? "Parcel picked up" : "Delivered — nice work");
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the delivery");
    } finally {
      setBusy(false);
    }
  };

  const addProof = async () => {
    if (!user) return;
    try {
      const res = await captureAndUpload({ bucket: "job-photos", userId: user.id, scope: id });
      if (res?.path) {
        setProof(res.path);
        toast.success("Proof photo attached");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };

  if (delivery.isLoading) {
    return (
      <>
        <AppBar title="Delivery" back />
        <Screen>
          <Section>
            <SkeletonList rows={4} />
          </Section>
        </Screen>
      </>
    );
  }

  if (!d) {
    return (
      <>
        <AppBar title="Delivery" back />
        <Screen>
          <Section>
            <Card>This delivery is no longer available.</Card>
          </Section>
        </Screen>
      </>
    );
  }

  const stage = d.status === "accepted" ? "pickup" : d.status === "picked_up" ? "dropoff" : "done";
  const target =
    stage === "pickup"
      ? { lat: d.pickup_lat, lng: d.pickup_lng, address: d.pickup_address }
      : { lat: d.dropoff_lat, lng: d.dropoff_lng, address: d.dropoff_address };

  return (
    <>
      <AppBar
        title={`${d.service_tier} delivery`}
        subtitle={String(d.status).replace(/_/g, " ")}
        back
      />
      <Screen>
        <Section>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-primary">Pickup</p>
                <p className="truncate text-sm font-semibold">{d.pickup_address}</p>
                <p className="mt-2 text-[11px] uppercase tracking-wider text-accent">Dropoff</p>
                <p className="truncate text-sm font-semibold">{d.dropoff_address}</p>
              </div>
              <div className="shrink-0 text-right">
                <Pill tone="primary">{d.parcel_size}</Pill>
                <p className="mt-1 text-sm font-semibold">{money(d.price)}</p>
                <p className="text-[11px] text-muted-foreground">{d.distance_km ?? "—"} km</p>
              </div>
            </div>
            {d.notes && <p className="mt-3 text-sm text-muted-foreground">{d.notes}</p>}

            <div className="mt-4 grid grid-cols-3 gap-2">
              <GhostButton
                onClick={() =>
                  target.lat && target.lng
                    ? openNavigation({ lat: target.lat, lng: target.lng })
                    : toast.error("No pin available")
                }
              >
                <Navigation className="size-4" /> Navigate
              </GhostButton>
              <GhostButton
                onClick={() =>
                  d.recipient_phone
                    ? window.open(`tel:${d.recipient_phone}`)
                    : toast.error("No phone on file")
                }
              >
                <Phone className="size-4" /> Call
              </GhostButton>
              <GhostButton onClick={() => navigate({ to: "/m/driver/messages" })}>
                <MessageSquare className="size-4" /> Messages
              </GhostButton>
            </div>
          </Card>
        </Section>

        <Section title="Recipient">
          <Card className="text-sm">
            <p className="font-medium">{d.recipient_name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {d.recipient_phone ?? "No phone provided"}
            </p>
          </Card>
        </Section>

        {stage === "dropoff" && (
          <Section title="Proof of delivery">
            <GhostButton onClick={() => void addProof()}>
              <Camera className="size-4" /> {proof ? "Photo attached" : "Take photo"}
            </GhostButton>
          </Section>
        )}

        {stage !== "done" ? (
          <div className="sticky bottom-24 px-4">
            <PrimaryButton
              loading={busy}
              onClick={() => void advance(stage === "pickup" ? "picked_up" : "delivered")}
            >
              {stage === "pickup" ? "Confirm pickup" : "Mark delivered"}
            </PrimaryButton>
          </div>
        ) : (
          <Section>
            <Card className="flex items-center gap-3 text-sm">
              <Package className="size-4 text-accent" /> Delivery complete
            </Card>
          </Section>
        )}
      </Screen>
    </>
  );
}
