import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Star, BadgeCheck, MapPin, ImagePlus, X } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { LocationMap } from "@/components/location-map";
import { PaymentMethodPicker, type PaymentMethod } from "@/components/payment-method-picker";
import { PaymentProcessingDialog } from "@/components/payment-processing-dialog";
import { BookingReceiptDialog, type BookingReceipt } from "@/components/booking-receipt";
import { BookingCalendar } from "@/components/booking-calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { searchAddress } from "@/lib/geo.functions";
import { services } from "@/data/services";
import { createJob } from "@/lib/dispatch.functions";
import { fulfilmentModeFor } from "@/lib/dispatch-config";

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const Route = createFileRoute("/_authenticated/book/$category")({
  validateSearch: (search: Record<string, unknown>) => ({
    provider: typeof search.provider === "string" ? search.provider : undefined,
  }),
  head: () => ({ meta: [{ title: "Book a service — Zwits" }] }),
  component: BookCategory,
});

function BookCategory() {
  const { category } = Route.useParams();
  const { provider: preselectedProvider } = Route.useSearch();
  const { user } = useAuth();
  const qc = useQueryClient();
  const service = services.find((s) => s.slug === category);

  const [providerId, setProviderId] = useState<string | null>(preselectedProvider ?? null);
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [description, setDescription] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [radiusKm, setRadiusKm] = useState(25);
  const [cityCoords, setCityCoords] = useState<Record<string, { lat: number; lng: number } | null>>({});
  const [step, setStep] = useState<1 | 2>(1);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [budget, setBudget] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const geocodeCity = useServerFn(searchAddress);
  const submitJob = useServerFn(createJob);
  const mode = providerId ? "direct" : fulfilmentModeFor(category);

  const { data: providers } = useQuery({
    queryKey: ["providers", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .eq("category", category)
        .order("rating_avg", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Geocode unique provider cities via Nominatim (OpenStreetMap)
  useEffect(() => {
    if (!providers || !coords) return;
    const cities = Array.from(new Set(providers.map((p) => p.city).filter(Boolean)));
    cities.forEach((city) => {
      if (city in cityCoords) return;
      geocodeCity({ data: { query: `${city}, Zimbabwe`, limit: 1 } })
        .then((res) => {
          const hit = res[0];
          setCityCoords((prev) => ({
            ...prev,
            [city]: hit ? { lat: hit.lat, lng: hit.lng } : null,
          }));
        })
        .catch(() => setCityCoords((prev) => ({ ...prev, [city]: null })));
    });
  }, [providers, coords, cityCoords, geocodeCity]);


  const visibleProviders = useMemo(() => {
    if (!providers) return [];
    let list = providers.map((p) => {
      const c = cityCoords[p.city];
      const distance = coords && c ? haversineKm(coords, c) : null;
      return { ...p, distance };
    });
    if (availableOnly) list = list.filter((p) => p.available);
    if (coords) {
      list = list.filter((p) => p.distance == null || p.distance <= radiusKm);
      list.sort((a, b) => {
        if (a.distance == null && b.distance == null) return 0;
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });
    }
    return list;
  }, [providers, cityCoords, coords, availableOnly, radiusKm]);

  const selectedProvider = useMemo(
    () => visibleProviders.find((p) => p.id === providerId) ?? null,
    [visibleProviders, providerId]
  );

  // Final price = hourly rate of selected provider, or median of filtered list for auto-match
  const estimate = useMemo(() => {
    const rates = visibleProviders.map((p) => Number(p.hourly_rate)).filter((n) => n > 0);
    const fallback = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    const hourly = selectedProvider ? Number(selectedProvider.hourly_rate) : fallback;
    const price = Math.round(hourly * 100) / 100;
    const distance = selectedProvider?.distance ?? null;
    // Travel ETA at ~30 km/h + 10 min prep
    const etaMinutes = distance != null ? Math.max(10, Math.round((distance / 30) * 60) + 10) : null;
    return { hourly, price, distance, etaMinutes };
  }, [selectedProvider, visibleProviders]);

  const create = useMutation({
    mutationFn: async (_txn: { transactionId: string | null }) => {
      if (!paymentMethod) throw new Error("Choose a payment method");

      const paths: string[] = [];
      for (const file of photos) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("job-photos").upload(path, file);
        if (upErr) throw new Error(`Photo upload failed: ${upErr.message}`);
        paths.push(path);
      }

      return submitJob({
        data: {
          category: category!,
          address,
          description: description || null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          scheduledFor: scheduled && scheduled !== "ASAP" ? scheduled : null,
          budget: budget ? Number(budget) : null,
          price: estimate.price || null,
          photos: paths,
          paymentMethod,
          preferredProviderId: providerId,
          rankedProviderIds: visibleProviders.map((p) => p.id),
        },
      });
    },
    onSuccess: async (data) => {
      toast.success(
        data.mode === "quotes"
          ? "Request sent — providers are preparing quotes"
          : data.mode === "dispatch"
            ? "Request sent — finding you a provider"
            : "Booking confirmed",
      );
      const methodLabel = paymentMethod === "cash" ? "Cash on delivery" : paymentMethod!.toUpperCase();
      const ref = data.id.slice(0, 8).toUpperCase();
      const body = [
        `Service: ${service!.name}`,
        `Address: ${address}`,
        scheduled && scheduled !== "ASAP" ? `Scheduled: ${new Date(scheduled).toLocaleString()}` : "Scheduled: ASAP",
        `Payment: ${methodLabel}`,
        `Reference: ${ref}`,
      ].filter(Boolean).join("\n");
      await supabase.from("notifications").insert({
        user_id: user!.id,
        title: `Request sent — ${service!.name}`,
        body,
        link: `/bookings/${data.id}`,
        kind: "booking",
      });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      setReceipt({
        id: data.id,
        category: category!,
        serviceName: service!.name,
        address,
        scheduledFor: scheduled && scheduled !== "ASAP" ? scheduled : null,
        paymentMethod: paymentMethod!,
        paymentReference: paymentMethod === "cash" ? null : paymentReference.trim() || null,
        createdAt: data.createdAt,
      });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setReceipt(null);
    setProviderId(null);
    setAddress("");
    setCoords(null);
    setDescription("");
    setScheduled("");
    setPaymentMethod(null);
    setPaymentReference("");
    setBudget("");
    setPhotos([]);
    setStep(1);
  };

  if (!service) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-md p-10 text-center">
          <p>Unknown service</p>
          <Link to="/dashboard" className="text-primary underline">Go back</Link>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground">← Dashboard</Link>
          <Link to="/services" className="hover:text-foreground">All services</Link>
          <Link to="/services/$slug" params={{ slug: category }} className="hover:text-foreground">{service?.name ?? "Service"} details</Link>
          <Link to="/contact" className="hover:text-foreground">Support</Link>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <service.icon className="size-8 text-primary" />
          <div>
            <h1 className="font-display text-3xl font-bold">Book {service.name}</h1>
            <p className="text-sm text-muted-foreground">{service.tagline}</p>
          </div>
        </div>

        <ol className="mt-6 flex items-center gap-2 text-xs">
          {[
            { n: 1, label: "Find a provider" },
            { n: 2, label: "Confirm & pay" },
          ].map((s) => (
            <li key={s.n} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${step === s.n ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>
              <span className={`grid size-5 place-items-center rounded-full text-[10px] font-semibold ${step === s.n ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{s.n}</span>
              {s.label}
            </li>
          ))}
        </ol>

        {step === 1 && (<>
        <div className="mt-8 flex items-end justify-between gap-3">

          <h2 className="text-sm font-medium text-muted-foreground">Choose a provider</h2>
          <span className="text-xs text-muted-foreground">{visibleProviders.length} match{visibleProviders.length === 1 ? "" : "es"}</span>
        </div>

        <div className="mt-3 grid gap-3 rounded-2xl border border-border bg-card/50 p-4 sm:grid-cols-[auto,1fr] sm:items-center">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Available now
          </label>
          <label className="grid gap-1.5">
            <span className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="size-3" /> Radius</span>
              <span>{coords ? `${radiusKm} km` : "Set address to enable"}</span>
            </span>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={radiusKm}
              disabled={!coords}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full accent-primary disabled:opacity-50"
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setProviderId(null)}
            className={`rounded-2xl border p-4 text-left transition ${providerId === null ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
          >
            <div className="text-sm font-medium">Auto-match</div>
            <div className="text-xs text-muted-foreground">We'll assign the first available pro.</div>
          </button>
          {visibleProviders.map((p) => (
            <button
              key={p.id}
              onClick={() => setProviderId(p.id)}
              className={`rounded-2xl border p-4 text-left transition ${providerId === p.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {p.business_name}
                {p.verified && <BadgeCheck className="size-4 text-gold" />}
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${p.available ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                  {p.available ? "Available" : "Busy"}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5"><Star className="size-3 fill-gold text-gold" /> {Number(p.rating_avg).toFixed(1)}</span>
                <span>· {p.city}</span>
                <span>· ${p.hourly_rate}/hr</span>
                {p.distance != null && (
                  <span className="flex items-center gap-0.5">· <MapPin className="size-3" /> {p.distance.toFixed(1)} km</span>
                )}
              </div>
            </button>
          ))}
        </div>
        {visibleProviders.length === 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {providers && providers.length > 0
              ? "No providers match your filters — try widening the radius or turning off 'Available now'."
              : "No providers listed yet — we'll auto-match."}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!address) return toast.error("Add an address");
            if (!scheduled) return toast.error("Pick a time or choose ASAP");
            setStep(2);
          }}
          className="mt-8 grid gap-4 rounded-3xl border border-border bg-card p-6"
        >
          <label className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">Address</span>
            <AddressAutocomplete
              required
              value={address}
              onChange={(v) => {
                setAddress(v.address);
                if (v.lat != null && v.lng != null) setCoords({ lat: v.lat, lng: v.lng });
              }}
            />
          </label>
          {coords && <LocationMap lat={coords.lat} lng={coords.lng} />}
          <div className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">When</span>
            <BookingCalendar
              rules={service.scheduling}
              value={scheduled}
              onChange={setScheduled}
              providerId={providerId}
            />
          </div>
          <label className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">Details</span>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={`Describe your ${service.name.toLowerCase()} request…`}
              className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">Your budget (optional, USD)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder={estimate.price ? estimate.price.toFixed(2) : "40.00"}
              className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
            />
          </label>
          <div className="grid gap-2">
            <span className="text-xs text-muted-foreground">Photos (optional, up to 6)</span>
            <div className="flex flex-wrap gap-2">
              {photos.map((f, i) => (
                <div key={`${f.name}-${i}`} className="relative">
                  <img src={URL.createObjectURL(f)} alt={f.name} className="size-20 rounded-lg border border-border object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-destructive text-destructive-foreground"
                    aria-label="Remove photo"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {photos.length < 6 && (
                <label className="grid size-20 cursor-pointer place-items-center rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary/50">
                  <ImagePlus className="size-5" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []).filter((f) => f.size <= 5 * 1024 * 1024);
                      if (files.length !== (e.target.files?.length ?? 0)) toast.error("Each photo must be under 5 MB");
                      setPhotos((p) => [...p, ...files].slice(0, 6));
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>
          <p className="rounded-xl border border-border bg-background/60 p-3 text-xs text-muted-foreground">
            {mode === "direct"
              ? "Your request goes straight to the provider you picked."
              : mode === "quotes"
                ? "We'll invite up to 5 verified providers to quote. You compare and choose."
                : "We'll offer the job to the closest verified providers — first to accept gets it."}
          </p>
          <button className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
            Continue to confirm
          </button>
        </form>
        </>)}

        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!paymentMethod) return toast.error("Choose a payment method");
              if (paymentMethod === "cash") {
                create.mutate({ transactionId: null });
              } else {
                setPayDialogOpen(true);
              }
            }}
            className="mt-8 grid gap-5 rounded-3xl border border-border bg-card p-6"
          >
            <div>
              <h2 className="font-display text-xl font-semibold">Confirm your booking</h2>
              <p className="text-xs text-muted-foreground">Review the details before sending the request.</p>
            </div>

            <div className="grid gap-3 rounded-2xl border border-border bg-background/60 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium">{selectedProvider ? selectedProvider.business_name : "Auto-match"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{service.name}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Address</span>
                <span className="max-w-[60%] text-right font-medium">{address}</span>
              </div>
              {scheduled && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">When</span>
                  <span className="font-medium">
                    {scheduled === "ASAP" ? "ASAP" : new Date(scheduled).toLocaleString()}
                  </span>
                </div>
              )}
              {estimate.distance != null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Distance</span>
                  <span className="font-medium">{estimate.distance.toFixed(1)} km</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Final price</div>
                <div className="mt-1 font-display text-2xl font-bold tabular-nums">${estimate.price.toFixed(2)}</div>
                <div className="text-[11px] text-muted-foreground">≈ 1 hr at ${estimate.hourly.toFixed(2)}/hr</div>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Estimated ETA</div>
                <div className="mt-1 font-display text-2xl font-bold tabular-nums">
                  {scheduled && scheduled !== "ASAP" ? "Scheduled" : estimate.etaMinutes != null ? `${estimate.etaMinutes} min` : "—"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {scheduled && scheduled !== "ASAP" ? "At your chosen time" : estimate.etaMinutes != null ? "Based on distance" : "Set address to estimate"}
                </div>
              </div>
            </div>

            <div className="grid gap-1.5">
              <span className="text-xs text-muted-foreground">Payment method</span>
              <PaymentMethodPicker
                value={paymentMethod}
                onChange={setPaymentMethod}
                reference={paymentReference}
                onReferenceChange={setPaymentReference}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => setStep(1)} className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted">
                ← Back
              </button>
              <button disabled={create.isPending || !paymentMethod} className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {create.isPending
                  ? "Finalising…"
                  : paymentMethod === "cash"
                    ? `Confirm — $${estimate.price.toFixed(2)}`
                    : `Pay $${estimate.price.toFixed(2)} & confirm`}
              </button>
            </div>
          </form>
        )}
      </section>

      {payDialogOpen && paymentMethod && paymentMethod !== "cash" && (
        <PaymentProcessingDialog
          method={paymentMethod}
          amount={estimate.price}
          reference={paymentReference}
          onCancel={() => setPayDialogOpen(false)}
          onChangeMethod={(m) => setPaymentMethod(m)}
          onChangeReference={(v) => setPaymentReference(v)}
          onFailure={(reason) => {
            toast.error(`Payment failed: ${reason}`, {
              description: "No money was deducted. You can retry or pick a different payment method.",
            });
          }}
          onSuccess={(transactionId) => {
            setPayDialogOpen(false);
            create.mutate({ transactionId });
          }}
        />
      )}

      {receipt && <BookingReceiptDialog receipt={receipt} onClose={resetForm} />}
    </SiteShell>
  );
}
