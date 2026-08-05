import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, MessageSquare, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { confirmCompletion } from "@/lib/dispatch.functions";
import { LiveTrackingMap } from "@/components/live-tracking-map";
import {
  CUSTOMER_STATUS_COPY,
  LIFECYCLE,
  STATUS_LABEL,
  stageIndex,
  type JobStatus,
} from "@/lib/job-lifecycle";
import {
  AppBar,
  Card,
  Empty,
  GhostButton,
  Pill,
  PrimaryButton,
  Screen,
  Section,
  SkeletonList,
  money,
  when,
} from "@/mobile/ui";

export const Route = createFileRoute("/m/customer/track/$id")({ component: TrackScreen });

const STEPS = LIFECYCLE.filter((s) => s !== "pending");

function TrackScreen() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const confirm = useServerFn(confirmCompletion);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);

  const booking = useQuery({
    queryKey: ["m", "booking", id],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const b = booking.data as any;
  const step = stageIndex(b?.status ?? "pending") - 1;

  const submitRating = async () => {
    if (!b?.provider_id || !user || !rating) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("ratings").insert({
        booking_id: b.id,
        customer_id: user.id,
        provider_id: b.provider_id,
        rating,
        review: review.trim() || null,
      });
      if (error) throw error;
      toast.success("Thanks for the review!");
      void booking.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save your review");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AppBar title="Live tracking" subtitle={b ? String(b.category) : undefined} back />
      <Screen>
        <Section>
          {booking.isLoading ? (
            <SkeletonList rows={3} />
          ) : !b ? (
            <Empty title="Booking not found" />
          ) : (
            <div className="grid gap-4">
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-primary">
                      {b.category}
                    </p>
                    <p className="truncate text-sm font-semibold">{b.address}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{when(b.scheduled_for)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Pill tone="primary">{STATUS_LABEL[b.status as JobStatus] ?? b.status}</Pill>
                    {b.price != null && (
                      <p className="mt-1 text-xs font-semibold">{money(b.price)}</p>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm">{CUSTOMER_STATUS_COPY[b.status as JobStatus] ?? ""}</p>

                <ol className="mt-4 flex items-center gap-1">
                  {STEPS.map((s, i) => (
                    <li key={s} className="flex flex-1 items-center gap-1">
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
                          i <= step
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {i <= step ? <CheckCircle2 className="size-3.5" /> : i + 1}
                      </span>
                      {i < STEPS.length - 1 && (
                        <span
                          className={`h-0.5 flex-1 rounded-full ${i < step ? "bg-primary" : "bg-muted"}`}
                        />
                      )}
                    </li>
                  ))}
                </ol>
              </Card>

              {["accepted", "travelling", "arrived", "in_progress"].includes(b.status) && (
                <LiveTrackingMap
                  bookingId={b.id}
                  destination={b.lat && b.lng ? { lat: Number(b.lat), lng: Number(b.lng) } : null}
                  className="h-64 overflow-hidden rounded-3xl"
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/m/chat/$bookingId"
                  params={{ bookingId: b.id }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border text-sm font-medium"
                >
                  <MessageSquare className="size-4" /> Chat
                </Link>
                <GhostButton onClick={() => void booking.refetch()}>Refresh</GhostButton>
              </div>

              {b.status === "completed" && !b.customer_confirmed_at && (
                <Card>
                  <p className="text-sm font-semibold">Confirm the work is done</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Confirming releases payment to your provider.
                  </p>
                  <div className="mt-3">
                    <PrimaryButton
                      loading={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await confirm({ data: { bookingId: b.id } });
                          toast.success("Confirmed — thank you!");
                          void booking.refetch();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Could not confirm");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Confirm completion
                    </PrimaryButton>
                  </div>
                </Card>
              )}

              {b.status === "completed" && b.provider_id && (
                <Card>
                  <p className="text-sm font-semibold">Rate your provider</p>
                  <div className="mt-2 flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setRating(i + 1)}
                        aria-label={`${i + 1} stars`}
                        className="p-1"
                      >
                        <Star
                          className={`size-7 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    rows={3}
                    placeholder="Tell others how it went (optional)"
                    className="mt-2 w-full resize-none rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
                  />
                  <div className="mt-3">
                    <PrimaryButton
                      loading={busy}
                      disabled={!rating}
                      onClick={() => void submitRating()}
                    >
                      Submit review
                    </PrimaryButton>
                  </div>
                </Card>
              )}
            </div>
          )}
        </Section>
      </Screen>
    </>
  );
}
