import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MapPin, Clock, DollarSign, Timer, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { listMyOffers, respondToOffer, submitQuote, signJobPhotos } from "@/lib/dispatch.functions";

type Offer = {
  offerId: string;
  status: string;
  expiresAt: string;
  wave: number;
  booking: {
    id: string;
    category: string;
    description: string | null;
    address: string;
    budget: number | null;
    price: number | null;
    scheduledFor: string | null;
    photos: string[];
    fulfilmentMode: string;
    customerName: string;
  };
};

function useCountdown(iso: string) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(iso).getTime() - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, new Date(iso).getTime() - Date.now())), 250);
    return () => clearInterval(t);
  }, [iso]);
  return Math.ceil(left / 1000);
}

export function AvailableJobs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchOffers = useServerFn(listMyOffers);

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["job-offers", user?.id],
    enabled: !!user,
    queryFn: () => fetchOffers({ data: undefined }) as Promise<Offer[]>,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`offers:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_offers", filter: `provider_user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["job-offers"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Looking for jobs…</p>;

  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">No job offers right now.</p>
        <p className="mt-1 text-xs text-muted-foreground">Stay online — new jobs appear here instantly.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {offers.map((o) => (
        <OfferCard key={o.offerId} offer={o} />
      ))}
    </ul>
  );
}

function OfferCard({ offer }: { offer: Offer }) {
  const qc = useQueryClient();
  const respond = useServerFn(respondToOffer);
  const quote = useServerFn(submitQuote);
  const sign = useServerFn(signJobPhotos);
  const seconds = useCountdown(offer.expiresAt);
  const isQuoteMode = offer.booking.fulfilmentMode === "quotes";
  const [showQuote, setShowQuote] = useState(false);
  const [price, setPrice] = useState(offer.booking.budget ? String(offer.booking.budget) : "");
  const [eta, setEta] = useState("60");
  const [message, setMessage] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!offer.booking.photos.length) return;
    sign({ data: { paths: offer.booking.photos } })
      .then((urls) => setPhotoUrls(urls as string[]))
      .catch(() => setPhotoUrls([]));
  }, [offer.booking.photos, sign]);

  const act = useMutation({
    mutationFn: (action: "accept" | "decline") => respond({ data: { offerId: offer.offerId, action } }),
    onSuccess: (res: any, action) => {
      if (action === "decline") toast("Declined");
      else if (res?.won) toast.success("Job is yours — head over to Active jobs");
      else toast.error(res?.reason ?? "Job no longer available");
      qc.invalidateQueries({ queryKey: ["job-offers"] });
      qc.invalidateQueries({ queryKey: ["provider-jobs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not respond"),
  });

  const sendQuote = useMutation({
    mutationFn: () =>
      quote({
        data: {
          offerId: offer.offerId,
          price: Number(price),
          etaMinutes: Number(eta),
          message: message.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Quote sent");
      setShowQuote(false);
      qc.invalidateQueries({ queryKey: ["job-offers"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not send quote"),
  });

  const expired = seconds <= 0 && offer.status === "offered";

  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-primary">
            {offer.booking.category} · wave {offer.wave}
          </div>
          <div className="mt-1 flex items-center gap-1.5 font-medium">
            <MapPin className="size-4 shrink-0 text-muted-foreground" /> {offer.booking.address}
          </div>
          {offer.booking.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{offer.booking.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <DollarSign className="size-3" />
              {offer.booking.budget != null
                ? `Budget $${offer.booking.budget.toFixed(2)}`
                : offer.booking.price != null
                  ? `$${offer.booking.price.toFixed(2)}`
                  : "Open budget"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {offer.booking.scheduledFor ? new Date(offer.booking.scheduledFor).toLocaleString() : "ASAP"}
            </span>
            <span>Customer: {offer.booking.customerName}</span>
          </div>
        </div>
        {offer.status === "offered" && (
          <span
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs tabular-nums ${
              seconds <= 10 ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
            }`}
          >
            <Timer className="size-3" /> {seconds}s
          </span>
        )}
        {offer.status === "quoted" && (
          <span className="rounded-full bg-gold/20 px-3 py-1 text-xs text-gold">Quote sent</span>
        )}
      </div>

      {photoUrls.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {photoUrls.map((url) => (
            <img
              key={url}
              src={url}
              alt={`${offer.booking.category} job photo`}
              className="size-20 shrink-0 rounded-lg border border-border object-cover"
              loading="lazy"
            />
          ))}
        </div>
      )}
      {photoUrls.length === 0 && offer.booking.photos.length > 0 && (
        <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <ImageIcon className="size-3" /> {offer.booking.photos.length} photo(s)
        </div>
      )}

      {offer.status === "offered" && !expired && (
        <div className="mt-4 flex flex-wrap gap-2">
          {isQuoteMode ? (
            <button
              onClick={() => setShowQuote((v) => !v)}
              className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
            >
              {showQuote ? "Close" : "Send a quote"}
            </button>
          ) : (
            <button
              disabled={act.isPending}
              onClick={() => act.mutate("accept")}
              className="rounded-full bg-primary px-5 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              {act.isPending ? "…" : "Accept"}
            </button>
          )}
          <button
            disabled={act.isPending}
            onClick={() => act.mutate("decline")}
            className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted disabled:opacity-60"
          >
            Decline
          </button>
        </div>
      )}

      {expired && <p className="mt-3 text-xs text-muted-foreground">Offer window closed.</p>}

      {showQuote && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!Number(price)) return toast.error("Enter your price");
            sendQuote.mutate();
          }}
          className="mt-4 grid gap-3 rounded-xl border border-border bg-background/60 p-3 sm:grid-cols-2"
        >
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">Your price (USD)</span>
            <input
              type="number"
              min={1}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">Arrival in (minutes)</span>
            <input
              type="number"
              min={5}
              step={5}
              value={eta}
              onChange={(e) => setEta(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-xs sm:col-span-2">
            <span className="text-muted-foreground">Message (optional)</span>
            <textarea
              rows={2}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <button
            disabled={sendQuote.isPending}
            className="rounded-full bg-primary px-5 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60 sm:col-span-2"
          >
            {sendQuote.isPending ? "Sending…" : "Submit quote"}
          </button>
        </form>
      )}
    </li>
  );
}
