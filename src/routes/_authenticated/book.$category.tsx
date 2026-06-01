import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Star, BadgeCheck, MapPin } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { LocationMap } from "@/components/location-map";
import { PaymentMethodPicker, type PaymentMethod } from "@/components/payment-method-picker";
import { BookingReceiptDialog, type BookingReceipt } from "@/components/booking-receipt";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { services } from "@/data/services";

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
  head: () => ({ meta: [{ title: "Book a service — Zwits" }] }),
  component: BookCategory,
});

function BookCategory() {
  const { category } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const service = services.find((s) => s.slug === category);

  const [providerId, setProviderId] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [description, setDescription] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);

  const { data: providers } = useQuery({
    queryKey: ["providers", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .eq("category", category)
        .eq("available", true)
        .order("rating_avg", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!paymentMethod) throw new Error("Choose a payment method");
      const { data, error } = await supabase.from("bookings").insert({
        customer_id: user!.id,
        provider_id: providerId,
        category,
        address,
        description,
        scheduled_for: scheduled || null,
        payment_method: paymentMethod,
        payment_reference: paymentMethod === "cash" ? null : paymentReference.trim() || null,
        payment_status: "pending",
      }).select("id, created_at").single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      toast.success("Booking confirmed");
      const methodLabel = paymentMethod === "cash"
        ? "Cash on delivery"
        : paymentMethod!.toUpperCase();
      const ref = data.id.slice(0, 8).toUpperCase();
      const body = [
        `Service: ${service!.name}`,
        `Address: ${address}`,
        scheduled ? `Scheduled: ${new Date(scheduled).toLocaleString()}` : null,
        `Payment: ${methodLabel}${paymentMethod !== "cash" && paymentReference ? ` (${paymentReference.trim()})` : ""}`,
        `Reference: ${ref}`,
        "",
        "Mock receipt — payment will be confirmed by the provider.",
      ].filter(Boolean).join("\n");
      await supabase.from("notifications").insert({
        user_id: user!.id,
        title: `Booking confirmed — ${service!.name}`,
        body,
        link: `/bookings/${data.id}`,
        kind: "booking",
      });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setReceipt({
        id: data.id,
        category: category!,
        serviceName: service!.name,
        address,
        scheduledFor: scheduled || null,
        paymentMethod: paymentMethod!,
        paymentReference: paymentMethod === "cash" ? null : paymentReference.trim() || null,
        createdAt: data.created_at,
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
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
        <div className="mt-4 flex items-center gap-3">
          <service.icon className="size-8 text-primary" />
          <div>
            <h1 className="font-display text-3xl font-bold">Book {service.name}</h1>
            <p className="text-sm text-muted-foreground">{service.tagline}</p>
          </div>
        </div>

        <h2 className="mt-8 text-sm font-medium text-muted-foreground">Choose a provider</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setProviderId(null)}
            className={`rounded-2xl border p-4 text-left transition ${providerId === null ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
          >
            <div className="text-sm font-medium">Auto-match</div>
            <div className="text-xs text-muted-foreground">We'll assign the first available pro.</div>
          </button>
          {providers?.map((p) => (
            <button
              key={p.id}
              onClick={() => setProviderId(p.id)}
              className={`rounded-2xl border p-4 text-left transition ${providerId === p.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {p.business_name}
                {p.verified && <BadgeCheck className="size-4 text-gold" />}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5"><Star className="size-3 fill-gold text-gold" /> {Number(p.rating_avg).toFixed(1)}</span>
                <span>· {p.city}</span>
                <span>· ${p.hourly_rate}/hr</span>
              </div>
            </button>
          ))}
        </div>
        {providers && providers.length === 0 && (
          <p className="mt-3 text-xs text-muted-foreground">No providers listed yet — we'll auto-match.</p>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
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
          <label className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">When (optional)</span>
            <input type="datetime-local" value={scheduled} onChange={(e) => setScheduled(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">Details</span>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={`Describe your ${service.name.toLowerCase()} request…`}
              className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
          </label>
          <div className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">Payment method</span>
            <PaymentMethodPicker
              value={paymentMethod}
              onChange={setPaymentMethod}
              reference={paymentReference}
              onReferenceChange={setPaymentReference}
            />
          </div>
          <button disabled={create.isPending || !paymentMethod} className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {create.isPending ? "Sending…" : "Request booking"}
          </button>
        </form>
      </section>
      {receipt && <BookingReceiptDialog receipt={receipt} onClose={resetForm} />}
    </SiteShell>
  );
}
