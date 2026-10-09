import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { services } from "@/data/services";
import { createJob } from "@/lib/dispatch.functions";
import { useAuth } from "@/hooks/use-auth";
import { captureAndUpload } from "@/mobile/media";
import { currentPosition } from "@/mobile/maps";
import { useSavedAddresses } from "@/mobile/local";
import { requireOnline } from "@/mobile/offline";
import { AppBar, Card, Empty, PrimaryButton, Screen, Section, money } from "@/mobile/ui";

const search = z.object({ provider: z.string().uuid().optional() });

export const Route = createFileRoute("/m/customer/book/$category")({
  head: () => ({ meta: [{"title": "Mobile Customer Book a service — Zwits"}, {"name": "description", "content": "Mobile Customer Book a service in your Zwits account for services, work and deliveries in Harare."}, {"property": "og:title", "content": "Mobile Customer Book a service — Zwits"}, {"property": "og:description", "content": "Mobile Customer Book a service in your Zwits account for services, work and deliveries in Harare."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex"}] }),
  validateSearch: (s) => search.parse(s),
  component: BookScreen,
});

function BookScreen() {
  const { category } = Route.useParams();
  const { provider } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const create = useServerFn(createJob);
  const { addresses } = useSavedAddresses();

  const service = services.find((s) => s.slug === category);
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [payment, setPayment] = useState<"cash" | "ecocash">("cash");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  if (!service) {
    return (
      <>
        <AppBar title="Book" back />
        <Screen>
          <Section>
            <Empty title="Unknown service" hint="Pick a service from the categories tab." />
          </Section>
        </Screen>
      </>
    );
  }

  const pinMyLocation = async () => {
    setLocating(true);
    const pos = await currentPosition();
    setLocating(false);
    if (!pos) return toast.error("Could not read your location");
    setCoords(pos);
    if (!address) setAddress(`Pinned location (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`);
    toast.success("Location pinned");
  };

  const addPhoto = async () => {
    if (!user) return;
    try {
      const res = await captureAndUpload({
        source: "camera",
        bucket: "job-photos",
        userId: user.id,
        scope: "bookings",
      });
      if (res?.path) setPhotos((p) => [...p, res.path]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Photo upload failed");
    }
  };

  const submit = async () => {
    if (!address.trim()) return toast.error("Add the job address");
    setBusy(true);
    try {
      await requireOnline("Creating a booking");
      const res = await create({
        data: {
          category: service.slug,
          address: address.trim(),
          description: description.trim() || undefined,
          lat: coords?.lat,
          lng: coords?.lng,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
          budget: budget ? Number(budget) : undefined,
          photos,
          paymentMethod: payment,
          preferredProviderId: provider,
        },
      });
      toast.success("Request sent — finding your provider");
      navigate({ to: "/m/customer/track/$id", params: { id: res.id }, replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the booking");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AppBar title={`Book ${service.name}`} subtitle={service.tagline} back />
      <Screen>
        <Section>
          <Card>
            <p className="text-xs text-muted-foreground">
              Typical price {money(service.estimate.from)}–{money(service.estimate.to)} per{" "}
              {service.estimate.unit}
            </p>

            <label htmlFor="mobile-job-address" className="mt-4 block text-xs font-medium">Where?</label>
            <Input id="mobile-job-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, suburb, Harare"
              className="mt-1 min-h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
            />
            <Button variant="outline"
              onClick={() => void pinMyLocation()}
              className="mt-2 inline-flex min-h-12 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-medium"
            >
              {locating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <MapPin className="size-3.5" />
              )}
              Use my current location
            </Button>

            {addresses.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {addresses.map((a) => (
                  <Button variant="outline"
                    key={a.id}
                    onClick={() => {
                      setAddress(a.address);
                      setCoords(a.lat && a.lng ? { lat: a.lat, lng: a.lng } : null);
                    }}
                    className="rounded-md border border-border px-3 py-1.5 text-[11px]"
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            )}

            <label htmlFor="mobile-job-details" className="mt-5 block text-xs font-medium">What needs doing?</label>
            <Textarea id="mobile-job-details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={service.examples.join(", ")}
              className="mt-1 w-full resize-none rounded-2xl border border-border bg-background p-4 text-sm outline-none focus:border-primary"
            />

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="mobile-job-budget" className="block text-xs font-medium">Budget (USD)</label>
                <Input id="mobile-job-budget"
                  inputMode="decimal"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Optional"
                  className="mt-1 min-h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="mobile-job-when" className="block text-xs font-medium">When</label>
                <Input id="mobile-job-when"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="mt-1 min-h-12 w-full rounded-2xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <label className="mt-5 block text-xs font-medium">Payment</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["cash"] as const).map((m) => (
                <Button variant="outline"
                  key={m}
                  onClick={() => setPayment(m)}
                  className={`min-h-12 rounded-2xl text-xs font-semibold capitalize ${
                    payment === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  Cash on completion
                </Button>
              ))}
            </div>

            <Button variant="outline"
              onClick={() => void addPhoto()}
              className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-2xl border border-border px-4 text-xs font-medium"
            >
              <Camera className="size-4" /> Add photo {photos.length > 0 && `(${photos.length})`}
            </Button>
          </Card>

          <div className="mt-4">
            <PrimaryButton loading={busy} onClick={() => void submit()}>
              {provider ? "Request this provider" : "Find me a provider"}
            </PrimaryButton>
          </div>
        </Section>
      </Screen>
    </>
  );
}
