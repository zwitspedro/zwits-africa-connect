import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Calendar, MapPin, CreditCard, Clock, MessageSquare, Star,
  RotateCcw, XCircle, CheckCircle2, CircleDashed, Loader2, Radar, Timer,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { LiveTrackingMap } from "@/components/live-tracking-map";
import { BookingAddressMap } from "@/components/booking-address-map";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { advanceDispatch, acceptQuote, confirmCompletion } from "@/lib/dispatch.functions";
import { MAX_WAVES } from "@/lib/dispatch-config";

export const Route = createFileRoute("/_authenticated/bookings/$id")({
  head: () => ({ meta: [{ title: "Booking details — Zwits" }] }),
  component: BookingDetailPage,
});

type BookingStatus = "pending" | "accepted" | "in_progress" | "completed" | "cancelled";

const STEPS: { key: BookingStatus; label: string; hint: string }[] = [
  { key: "pending", label: "Requested", hint: "Waiting for a provider" },
  { key: "accepted", label: "Accepted", hint: "Provider confirmed" },
  { key: "in_progress", label: "En route", hint: "Provider on the way" },
  { key: "completed", label: "Completed", hint: "Job finished" },
];

function BookingDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    enabled: !!user && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, providers(id, business_name, rating_avg, bio, city), ratings(rating)")
        .eq("id", id)
        .eq("customer_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Live updates: refetch when this booking row changes
  useEffect(() => {
    if (!user || !id) return;
    const channel = supabase
      .channel(`booking:${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["booking", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user, qc]);

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking cancelled");
      qc.invalidateQueries({ queryKey: ["booking", id] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not cancel"),
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

            <Timeline status={booking.status as BookingStatus} updatedAt={booking.updated_at} createdAt={booking.created_at} />

            {!booking.provider_id && booking.status === "pending" && (
              <DispatchPanel booking={booking} />
            )}

            {booking.status === "completed" && !(booking as any).customer_confirmed_at && (
              <ConfirmCompletion bookingId={booking.id} />
            )}



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
              {booking.lat != null && booking.lng != null && booking.status !== "in_progress" && booking.status !== "accepted" && (
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

            <ActionBar
              booking={booking}
              cancelling={cancel.isPending}
              onCancel={() => {
                if (confirm("Cancel this booking? This cannot be undone.")) cancel.mutate();
              }}
              onRebook={() =>
                navigate({
                  to: "/book/$category",
                  params: { category: booking.category },
                })
              }
            />

            {booking.status === "completed" && booking.provider_id && !(Array.isArray(booking.ratings) ? booking.ratings.length : booking.ratings) && (
              <RatePanel bookingId={booking.id} providerId={booking.provider_id} />
            )}

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

function Timeline({
  status,
  updatedAt,
  createdAt,
}: {
  status: BookingStatus;
  updatedAt: string;
  createdAt: string;
}) {
  if (status === "cancelled") {
    return (
      <div className="mt-5 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        <XCircle className="size-4" />
        Cancelled on {new Date(updatedAt).toLocaleString()}
      </div>
    );
  }
  const order: BookingStatus[] = ["pending", "accepted", "in_progress", "completed"];
  const currentIdx = order.indexOf(status);
  return (
    <ol className="mt-5 grid gap-2">
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const Icon = done ? CheckCircle2 : active ? Loader2 : CircleDashed;
        return (
          <li key={step.key} className="flex items-start gap-3">
            <Icon
              className={`mt-0.5 size-5 shrink-0 ${
                done
                  ? "text-emerald-400"
                  : active
                    ? "animate-spin text-primary"
                    : "text-muted-foreground/50"
              }`}
            />
            <div className="flex-1">
              <div className={`text-sm font-medium ${active || done ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {active
                  ? step.hint
                  : done && i === 0
                    ? new Date(createdAt).toLocaleString()
                    : done && i === currentIdx - 1
                      ? new Date(updatedAt).toLocaleString()
                      : step.hint}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ActionBar({
  booking,
  cancelling,
  onCancel,
  onRebook,
}: {
  booking: any;
  cancelling: boolean;
  onCancel: () => void;
  onRebook: () => void;
}) {
  const canMessage = !!booking.provider_id && booking.status !== "cancelled";
  const canCancel = booking.status === "pending" || booking.status === "accepted";
  const canRebook = booking.status === "completed" || booking.status === "cancelled";

  return (
    <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
      {canMessage && (
        <Link
          to="/messages/$bookingId"
          params={{ bookingId: booking.id }}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          <MessageSquare className="size-3.5" /> Message provider
        </Link>
      )}
      {canRebook && (
        <button
          onClick={onRebook}
          className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-medium text-background hover:opacity-90"
        >
          <RotateCcw className="size-3.5" /> Book again
        </button>
      )}
      {canCancel && (
        <button
          onClick={onCancel}
          disabled={cancelling}
          className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
        >
          <XCircle className="size-3.5" /> {cancelling ? "Cancelling…" : "Cancel booking"}
        </button>
      )}
    </div>
  );
}

function RatePanel({ bookingId, providerId }: { bookingId: string; providerId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ratings").insert({
        booking_id: bookingId,
        provider_id: providerId,
        customer_id: user!.id,
        rating,
        review,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thanks for the feedback");
      qc.invalidateQueries({ queryKey: ["booking", bookingId] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not submit rating"),
  });

  return (
    <div className="mt-5 rounded-2xl border border-gold/40 bg-gold/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Star className="size-4 fill-gold text-gold" />
        Rate your provider
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Help other customers find great pros.</p>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}>
            <Star className={`size-7 ${n <= rating ? "fill-gold text-gold" : "text-muted-foreground/40"}`} />
          </button>
        ))}
      </div>
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        rows={3}
        placeholder="Leave a review (optional)"
        className="mt-3 w-full rounded-lg border border-input bg-background p-2 text-sm outline-none focus:border-primary"
        maxLength={500}
      />
      <button
        onClick={() => submit.mutate()}
        disabled={submit.isPending}
        className="mt-3 rounded-full bg-primary px-5 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
      >
        {submit.isPending ? "Submitting…" : "Submit rating"}
      </button>
    </div>
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

function DispatchPanel({ booking }: { booking: any }) {
  const qc = useQueryClient();
  const advance = useServerFn(advanceDispatch);
  const accept = useServerFn(acceptQuote);
  const isQuotes = booking.fulfilment_mode === "quotes";

  const { data: quotes = [] } = useQuery({
    queryKey: ["job-quotes", booking.id],
    enabled: isQuotes,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_quotes")
        .select("id, price, eta_minutes, message, status, provider_id, providers(business_name, rating_avg, city)")
        .eq("booking_id", booking.id)
        .eq("status", "submitted")
        .order("price", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Keep the dispatch waves moving while the customer is on this page.
  useEffect(() => {
    if (booking.dispatch_state === "no_providers") return;
    let cancelled = false;
    const tick = async () => {
      try {
        await advance({ data: { bookingId: booking.id, rankedProviderIds: [] } });
        if (!cancelled) qc.invalidateQueries({ queryKey: ["booking", booking.id] });
      } catch {
        /* transient — the next tick retries */
      }
    };
    tick();
    const t = setInterval(tick, 6000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [booking.id, booking.dispatch_state, advance, qc]);

  const choose = useMutation({
    mutationFn: (quoteId: string) => accept({ data: { quoteId } }),
    onSuccess: () => {
      toast.success("Provider booked");
      qc.invalidateQueries({ queryKey: ["booking", booking.id] });
      qc.invalidateQueries({ queryKey: ["job-quotes", booking.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not accept quote"),
  });

  return (
    <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {booking.dispatch_state === "no_providers" ? (
          <>
            <Timer className="size-4 text-destructive" /> No provider available yet
          </>
        ) : (
          <>
            <Radar className="size-4 animate-pulse text-primary" />
            {isQuotes ? "Collecting quotes" : "Finding you a provider"}
          </>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {booking.dispatch_state === "no_providers"
          ? "We couldn't reach an available provider. Try again shortly or widen your timing."
          : isQuotes
            ? "Verified providers are sending offers — compare and pick the one you like."
            : `Search round ${Math.min(booking.dispatch_wave ?? 1, MAX_WAVES)} of ${MAX_WAVES} — expanding until someone accepts.`}
      </p>

      {isQuotes && (
        <ul className="mt-4 grid gap-2">
          {quotes.length === 0 && (
            <li className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No quotes yet.
            </li>
          )}
          {quotes.map((q: any) => (
            <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {q.providers?.business_name ?? "Provider"}
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Star className="size-3 fill-gold text-gold" /> {Number(q.providers?.rating_avg ?? 0).toFixed(1)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Arrives in ~{q.eta_minutes} min{q.providers?.city ? ` · ${q.providers.city}` : ""}
                </div>
                {q.message && <p className="mt-1 text-xs text-muted-foreground">{q.message}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-lg font-bold tabular-nums">${Number(q.price).toFixed(2)}</span>
                <button
                  disabled={choose.isPending}
                  onClick={() => choose.mutate(q.id)}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
                >
                  Choose
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConfirmCompletion({ bookingId }: { bookingId: string }) {
  const qc = useQueryClient();
  const confirm = useServerFn(confirmCompletion);
  const submit = useMutation({
    mutationFn: () => confirm({ data: { bookingId } }),
    onSuccess: () => {
      toast.success("Thanks — payment released");
      qc.invalidateQueries({ queryKey: ["booking", bookingId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not confirm"),
  });

  return (
    <div className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CheckCircle2 className="size-4 text-emerald-400" /> Provider marked this job complete
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Confirm the work is done to release payment and leave a rating.</p>
      <button
        disabled={submit.isPending}
        onClick={() => submit.mutate()}
        className="mt-3 rounded-full bg-emerald-500 px-5 py-2 text-xs font-medium text-background disabled:opacity-60"
      >
        {submit.isPending ? "Confirming…" : "Confirm & release payment"}
      </button>
    </div>
  );
}
