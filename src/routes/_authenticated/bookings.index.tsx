import { Button } from "@/components/ui/button";
import { Status } from "@/components/ui/status";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/bookings/")({
  head: () => ({ meta: [{ title: "My bookings — Zwits" }, { name: "description", content: "Follow your Zwits service bookings and completed work." }, { property: "og:title", content: "My bookings — Zwits" }, { property: "og:description", content: "Follow your Zwits service bookings and completed work." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: BookingsPage,
});

function BookingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, providers(business_name, rating_avg), ratings(rating)")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false })
        // Data-light: never fetch an unbounded history over mobile data.
        .limit(25);
      if (error) throw error;
      return data;
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking cancelled");
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h1 className="font-display text-3xl font-bold">My bookings</h1>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
        </div>

        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
        {bookings && bookings.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
            <Link to="/dashboard" className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Book a service</Link>
          </div>
        )}

        <ul className="mt-6 grid gap-3">
          {bookings?.map((b: any) => (
            <li key={b.id} className="rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
              <Link to="/bookings/$id" params={{ id: b.id }} className="block">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-primary-text">{b.category}</div>
                    <div className="mt-1 font-medium">{b.providers?.business_name ?? "Awaiting provider"}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{b.address}</div>
                    {b.description && <div className="mt-1 text-xs text-muted-foreground">{b.description}</div>}
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              </Link>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">{new Date(b.created_at).toLocaleString()}</span>
                  <div className="flex gap-2">
                    {b.status === "completed" && b.provider_id && !b.ratings?.length && (
                      <RateButton bookingId={b.id} providerId={b.provider_id} />
                    )}
                    {(b.status === "pending" || b.status === "accepted") && (
                      <Button variant="outline"
                        onClick={(e) => { e.preventDefault(); cancel.mutate(b.id); }}
                        className="rounded-full border border-border px-3 py-1.5 hover:bg-muted"
                      >Cancel</Button>
                    )}
                  </div>
                </div>
            </li>
          ))}
        </ul>
      </section>
    </SiteShell>
  );
}

function StatusBadge({ status }: { status: string }) { return <Status status={status} />; }

function RateButton({ bookingId, providerId }: { bookingId: string; providerId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ratings").insert({
        booking_id: bookingId, provider_id: providerId, customer_id: user!.id, rating, review,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thanks for the feedback");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>Rate</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Rate your service</DialogTitle>
          <DialogDescription>How was your experience with this provider?</DialogDescription>
          <div className="flex gap-1" aria-label="Service rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <Button variant="ghost" size="icon" key={n} aria-label={`${n} ${n === 1 ? "star" : "stars"}`} aria-pressed={rating === n} onClick={() => setRating(n)}>
                <Star aria-hidden="true" className={`size-6 ${n <= rating ? "fill-gold text-gold" : "text-muted-foreground"}`} />
              </Button>
            ))}
          </div>
          <label className="grid gap-2 text-sm">Review (optional)<Textarea value={review} onChange={(e) => setReview(e.target.value)} /></label>
          <div className="flex gap-2">
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>Submit</Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
