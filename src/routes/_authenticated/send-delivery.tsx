import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Package, MapPin, Navigation } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { Panel } from "@/components/provider/dashboard-kit";
import { AddressAutocomplete, type AddressValue } from "@/components/address-autocomplete";
import { PARCEL_SIZES, TIERS, haversineKm, quotePrice, type ParcelSize, type ServiceTier } from "@/lib/delivery-config";
import { createDelivery } from "@/lib/delivery.functions";

const title = "Send a parcel — Zwits Delivery";
const description = "Book a live-tracked Zwits courier: set pickup and drop-off, pick a vehicle and get matched with a driver in seconds.";

export const Route = createFileRoute("/_authenticated/send-delivery")({
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
  component: SendDeliveryPage,
});

function SendDeliveryPage() {
  const navigate = useNavigate();
  const submit = useServerFn(createDelivery);

  const [tier, setTier] = useState<ServiceTier>("express_bike");
  const [size, setSize] = useState<ParcelSize>("small");
  const [pickup, setPickup] = useState<AddressValue>({ address: "" });
  const [dropoff, setDropoff] = useState<AddressValue>({ address: "" });
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const distance = haversineKm(
    pickup.lat != null && pickup.lng != null ? { lat: pickup.lat, lng: pickup.lng } : null,
    dropoff.lat != null && dropoff.lng != null ? { lat: dropoff.lat, lng: dropoff.lng } : null,
  );
  const price = quotePrice(tier, size, distance);

  const create = useMutation({
    mutationFn: () =>
      submit({
        data: {
          serviceTier: tier,
          parcelSize: size,
          pickupAddress: pickup.address,
          pickupLat: pickup.lat ?? null,
          pickupLng: pickup.lng ?? null,
          dropoffAddress: dropoff.address,
          dropoffLat: dropoff.lat ?? null,
          dropoffLng: dropoff.lng ?? null,
          recipientName: recipientName || null,
          recipientPhone: recipientPhone || null,
          notes: notes || null,
          paymentMethod,
        },
      }),
    onSuccess: (res: any) => {
      toast.success(res.offered > 0 ? "Finding you a driver…" : "Request created — we'll keep looking for a driver");
      navigate({ to: "/deliveries/$id", params: { id: res.id } });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not create the delivery"),
  });

  const field = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-10 sm:px-6">
        <header>
          <h1 className="font-display text-3xl font-bold">Send a parcel</h1>
          <p className="mt-1 text-sm text-muted-foreground">Matched with the nearest verified driver in seconds.</p>
        </header>

        <Panel title="Route">
          <div className="space-y-4">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5 text-emerald-400" /> Pickup address
              </label>
              <AddressAutocomplete value={pickup.address} onChange={setPickup} placeholder="Where should we collect?" />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Navigation className="size-3.5 text-gold" /> Drop-off address
              </label>
              <AddressAutocomplete value={dropoff.address} onChange={setDropoff} placeholder="Where is it going?" />
            </div>
          </div>
        </Panel>

        <Panel title="Vehicle" description="Pick what fits the parcel">
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(TIERS) as ServiceTier[]).map((k) => (
              <button
                key={k}
                onClick={() => setTier(k)}
                className={
                  tier === k
                    ? "rounded-2xl border border-primary bg-primary/10 p-4 text-left"
                    : "rounded-2xl border border-border p-4 text-left transition hover:border-primary/40"
                }
              >
                <Package className="size-5 text-primary" />
                <p className="mt-3 text-sm font-semibold">{TIERS[k].label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{TIERS[k].blurb}</p>
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {(Object.keys(PARCEL_SIZES) as ParcelSize[]).map((k) => (
              <button
                key={k}
                onClick={() => setSize(k)}
                className={
                  size === k
                    ? "rounded-xl border border-primary bg-primary/10 px-3 py-2 text-xs font-medium"
                    : "rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground"
                }
              >
                {PARCEL_SIZES[k].label}
                <span className="mt-0.5 block text-[10px] opacity-70">{PARCEL_SIZES[k].hint}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Recipient & notes">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">
              Recipient name
              <input className={`${field} mt-1`} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
            </label>
            <label className="text-xs text-muted-foreground">
              Recipient phone
              <input className={`${field} mt-1`} value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="+263…" />
            </label>
          </div>
          <label className="mt-3 block text-xs text-muted-foreground">
            Notes for the driver
            <textarea className={`${field} mt-1 min-h-20`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, floor, fragile…" />
          </label>
          <label className="mt-3 block text-xs text-muted-foreground">
            Payment
            <select className={`${field} mt-1`} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="cash">Cash on delivery</option>
              <option value="ecocash">EcoCash</option>
              <option value="card">Card</option>
            </select>
          </label>
        </Panel>

        <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-card/90 p-4 shadow-lg backdrop-blur">
          <div>
            <p className="text-xs text-muted-foreground">{distance != null ? `${distance} km estimated` : "Estimated fare"}</p>
            <p className="font-display text-2xl font-bold">${price.toFixed(2)}</p>
          </div>
          <button
            disabled={create.isPending || !pickup.address || !dropoff.address}
            onClick={() => create.mutate()}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {create.isPending ? "Requesting…" : "Request driver"}
          </button>
        </div>
      </div>
    </SiteShell>
  );
}
