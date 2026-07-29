import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MapPin, Navigation, PackageCheck, Truck, Phone } from "lucide-react";
import { EmptyState, Panel } from "@/components/provider/dashboard-kit";
import { useProviderTracking } from "@/hooks/use-provider-tracking";
import { DELIVERY_STATUS_LABELS, driverPayout } from "@/lib/delivery-config";
import { updateDeliveryStatus } from "@/lib/delivery.functions";
import type { DeliveryRow } from "./use-driver-data";

export function ActiveDelivery({ active }: { active: DeliveryRow[] }) {
  const qc = useQueryClient();
  const update = useServerFn(updateDeliveryStatus);
  const current = active[0] ?? null;

  // Publish live location while a delivery is in progress.
  useProviderTracking({ bookingId: current?.id ?? null, enabled: !!current });

  const mutation = useMutation({
    mutationFn: (v: { deliveryId: string; status: "picked_up" | "delivered" }) => update({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.status === "picked_up" ? "Marked as picked up" : "Delivery completed");
      qc.invalidateQueries({ queryKey: ["driver-deliveries"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update"),
  });

  if (!current)
    return (
      <Panel title="Active route" description="Your current pickup and drop-off">
        <EmptyState title="No active delivery" hint="Accept an offer and the route appears here." />
      </Panel>
    );

  const mapsUrl = (q: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
  const target = current.status === "accepted" ? current.pickup_address : current.dropoff_address;

  return (
    <div className="space-y-4">
      <Panel title="Active route" description={DELIVERY_STATUS_LABELS[current.status] ?? current.status}>
        <div className="space-y-4">
          <ol className="space-y-3">
            <Step
              icon={MapPin}
              label="Pickup"
              value={current.pickup_address}
              done={current.status !== "accepted"}
            />
            <Step
              icon={Navigation}
              label="Drop-off"
              value={current.dropoff_address}
              done={current.status === "delivered"}
            />
          </ol>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {current.distance_km != null && <span>{current.distance_km} km</span>}
            <span className="capitalize">{current.parcel_size} parcel</span>
            <span className="font-semibold text-emerald-400">Payout ${driverPayout(current.price).toFixed(2)}</span>
          </div>

          {(current.recipient_name || current.recipient_phone) && (
            <div className="rounded-2xl border border-border/70 p-3 text-sm">
              <p className="font-medium">{current.recipient_name ?? "Recipient"}</p>
              {current.recipient_phone && (
                <a
                  href={`tel:${current.recipient_phone}`}
                  className="mt-1 inline-flex items-center gap-1.5 text-xs text-primary"
                >
                  <Phone className="size-3.5" /> {current.recipient_phone}
                </a>
              )}
            </div>
          )}

          {current.notes && <p className="text-xs text-muted-foreground">“{current.notes}”</p>}

          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href={mapsUrl(target)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-center text-sm font-medium"
            >
              Navigate
            </a>
            {current.status === "accepted" ? (
              <button
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ deliveryId: current.id, status: "picked_up" })}
                className="flex-[2] rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Truck className="mr-2 inline size-4" /> Confirm pickup
              </button>
            ) : (
              <button
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ deliveryId: current.id, status: "delivered" })}
                className="flex-[2] rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                <PackageCheck className="mr-2 inline size-4" /> Mark delivered
              </button>
            )}
          </div>
        </div>
      </Panel>

      {active.length > 1 && (
        <Panel title="Queued deliveries" description="Complete the active one first">
          <ul className="space-y-2 text-sm">
            {active.slice(1).map((d) => (
              <li key={d.id} className="rounded-xl border border-border/70 p-3">
                <p className="truncate">{d.pickup_address}</p>
                <p className="truncate text-xs text-muted-foreground">→ {d.dropoff_address}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function Step({ icon: Icon, label, value, done }: { icon: any; label: string; value: string; done: boolean }) {
  return (
    <li className="flex gap-3">
      <span
        className={
          done
            ? "grid size-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-400"
            : "grid size-8 shrink-0 place-items-center rounded-full bg-primary/12 text-primary"
        }
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="block break-words text-sm">{value}</span>
      </span>
    </li>
  );
}
