import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Star, BadgeCheck } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { LocationMap } from "@/components/location-map";
import { PaymentMethodPicker, type PaymentMethod } from "@/components/payment-method-picker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { services } from "@/data/services";

export const Route = createFileRoute("/_authenticated/book/$category")({
  head: () => ({ meta: [{ title: "Book a service — Zwits" }] }),
  component: BookCategory,
});

function BookCategory() {
  const { category } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const service = services.find((s) => s.slug === category);

  const [providerId, setProviderId] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [description, setDescription] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentReference, setPaymentReference] = useState("");

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
      const { error } = await supabase.from("bookings").insert({
        customer_id: user!.id,
        provider_id: providerId,
        category,
        address,
        description,
        scheduled_for: scheduled || null,
        payment_method: paymentMethod,
        payment_reference: paymentMethod === "cash" ? null : paymentReference.trim() || null,
        payment_status: paymentMethod === "cash" ? "pending" : "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking sent");
      navigate({ to: "/bookings" });
    },
    onError: (e: any) => toast.error(e.message),
  });

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
          <button disabled={create.isPending} className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {create.isPending ? "Sending…" : "Request booking"}
          </button>
        </form>
      </section>
    </SiteShell>
  );
}
