import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, MapPin, CreditCard, Clock } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { LiveTrackingMap } from "@/components/live-tracking-map";
import { BookingAddressMap } from "@/components/booking-address-map";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/bookings/$id")({
  head: () => ({ meta: [{ title: "Booking details — Zwits" }] }),
  component: BookingDetailPage,
});

function BookingDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    enabled: !!user && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, providers(business_name, rating_avg, bio, city)")
        .eq("id", id)
        .eq("customer_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <SiteShell>
      <section className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <Link
          to="/bookings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to bookings
        </Link>

        <h1 className="mt-4 font-display text-2xl font-bold">Booking details</h1>

        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}

        {!isLoading && !booking && (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">Booking not found.</p>
          </div>
        )}

        {booking && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-primary">{booking.category}</div>
                <div className="mt-1 text-lg font-medium">
                  {booking.providers?.business_name ?? "Awaiting provider"}
                </div>
                {booking.providers?.city && (
                  <div className="mt-0.5 text-sm text-muted-foreground">{booking.providers.city}</div>
                )}
              </div>
              <StatusBadge status={booking.status} />
            </div>

            {(booking.status === "accepted" || booking.status === "in_progress") && (
              <div className="mt-5">
                <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Live tracking
                </div>
                <LiveTrackingMap
                  bookingId={booking.id}
                  destination={
                    booking.lat != null && booking.lng != null
                      ? { lat: booking.lat, lng: booking.lng }
                      : null
                  }
                />
              </div>
            )}


            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>{booking.address}</span>
              </div>
              {booking.lat != null && booking.lng != null && (
                <BookingAddressMap
                  position={{ lat: booking.lat, lng: booking.lng }}
                  address={booking.address}
                  className="h-56 w-full rounded-2xl border border-border bg-muted"
                />
              )}
              {booking.description && (
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{booking.description}</span>
                </div>
              )}
              {booking.scheduled_for && (
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>{new Date(booking.scheduled_for).toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>
                  {booking.payment_method === "cash"
                    ? "Cash on delivery"
                    : booking.payment_method?.toUpperCase()}
                  {booking.payment_reference && ` — ${booking.payment_reference}`}
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize">
                    {booking.payment_status}
                  </span>
                </span>
              </div>
            </div>

            <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
              <p>Reference: {booking.id.slice(0, 8).toUpperCase()}</p>
              <p>Created: {new Date(booking.created_at).toLocaleString()}</p>
            </div>
          </div>
        )}
      </section>
    </SiteShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-muted text-foreground",
    accepted: "bg-gold/20 text-gold",
    in_progress: "bg-primary/20 text-primary",
    completed: "bg-emerald-500/20 text-emerald-400",
    cancelled: "bg-destructive/20 text-destructive",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs ${map[status] ?? ""}`}>
      {status.replace("_", " ")}
    </span>
  );
}
