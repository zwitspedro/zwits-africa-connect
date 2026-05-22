import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({ meta: [{ title: "My bookings — Zwits" }] }),
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
        .order("created_at", { ascending: false });
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
        <div className="flex items-center justify-between">
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
            <li key={b.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-primary">{b.category}</div>
                  <div className="mt-1 font-medium">{b.providers?.business_name ?? "Awaiting provider"}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{b.address}</div>
                  {b.description && <div className="mt-1 text-xs text-muted-foreground">{b.description}</div>}
                </div>
                <StatusBadge status={b.status} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">{new Date(b.created_at).toLocaleString()}</span>
                <div className="flex gap-2">
                  {b.status === "completed" && b.provider_id && !b.ratings?.length && (
                    <RateButton bookingId={b.id} providerId={b.provider_id} />
                  )}
                  {(b.status === "pending" || b.status === "accepted") && (
                    <button
                      onClick={() => cancel.mutate(b.id)}
                      className="rounded-full border border-border px-3 py-1.5 hover:bg-muted"
                    >Cancel</button>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-muted text-foreground",
    accepted: "bg-gold/20 text-gold",
    in_progress: "bg-primary/20 text-primary",
    completed: "bg-emerald-500/20 text-emerald-400",
    cancelled: "bg-destructive/20 text-destructive",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs ${map[status] ?? ""}`}>{status.replace("_", " ")}</span>;
}

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

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-full bg-gold px-3 py-1.5 text-background">Rate</button>
    );
  }
  return (
    <div className="absolute inset-x-4 z-40 mt-2 rounded-2xl border border-border bg-card p-4 shadow-lg">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)}>
            <Star className={`size-6 ${n <= rating ? "fill-gold text-gold" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <textarea
        value={review} onChange={(e) => setReview(e.target.value)}
        placeholder="Leave a review (optional)"
        className="mt-3 w-full rounded-lg border border-input bg-background p-2 text-sm"
      />
      <div className="mt-2 flex gap-2">
        <button onClick={() => submit.mutate()} className="rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground">Submit</button>
        <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-xs">Cancel</button>
      </div>
    </div>
  );
}
