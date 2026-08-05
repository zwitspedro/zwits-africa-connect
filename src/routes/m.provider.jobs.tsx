import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, Clock, Timer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { listMyOffers, respondToOffer } from "@/lib/dispatch.functions";
import { useProviderData } from "@/components/provider/use-provider-data";
import { statusLabel } from "@/lib/job-lifecycle";
import {
  AppBar,
  Card,
  Empty,
  GhostButton,
  Pill,
  PrimaryButton,
  PullToRefresh,
  Screen,
  Section,
  SkeletonList,
  money,
  when,
} from "@/mobile/ui";

export const Route = createFileRoute("/m/provider/jobs")({ component: ProviderJobs });

type Tab = "offers" | "active" | "completed" | "cancelled";

const TABS: { key: Tab; label: string }[] = [
  { key: "offers", label: "Pending" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Done" },
  { key: "cancelled", label: "Cancelled" },
];

function ProviderJobs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const data = useProviderData();
  const [tab, setTab] = useState<Tab>("offers");
  const fetchOffers = useServerFn(listMyOffers);

  const offers = useQuery({
    queryKey: ["job-offers", user?.id],
    enabled: !!user,
    refetchInterval: 5000,
    queryFn: () => fetchOffers({ data: undefined }) as Promise<any[]>,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`mobile-offers:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_offers",
          filter: `provider_user_id=eq.${user.id}`,
        },
        () => void qc.invalidateQueries({ queryKey: ["job-offers", user.id] }),
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [user, qc]);

  const lists: Record<Tab, any[]> = {
    offers: offers.data ?? [],
    active: data.active ?? [],
    completed: data.completed ?? [],
    cancelled: data.cancelled ?? [],
  };

  return (
    <>
      <AppBar title="Jobs" subtitle="Offers, live work and history" />
      <Screen>
        <div className="sticky top-14 z-20 bg-background/95 px-4 py-3 backdrop-blur">
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-muted p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`min-h-10 rounded-xl text-[11px] font-semibold transition ${
                  tab === t.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {t.label}
                {t.key === "offers" && lists.offers.length > 0 ? ` (${lists.offers.length})` : ""}
              </button>
            ))}
          </div>
        </div>

        <PullToRefresh
          onRefresh={async () =>
            void (await Promise.all([
              offers.refetch(),
              qc.invalidateQueries({ queryKey: ["provider-jobs"] }),
            ]))
          }
        >
          <Section>
            {data.isLoading && tab !== "offers" ? (
              <SkeletonList rows={3} />
            ) : lists[tab].length === 0 ? (
              <Empty
                icon={Briefcase}
                title={
                  tab === "offers"
                    ? "No job offers right now"
                    : tab === "active"
                      ? "No jobs in progress"
                      : tab === "completed"
                        ? "No completed jobs yet"
                        : "Nothing cancelled"
                }
                hint={
                  tab === "offers" ? "Stay online — new offers arrive here instantly." : undefined
                }
              />
            ) : tab === "offers" ? (
              <div className="grid gap-3">
                {lists.offers.map((o) => (
                  <OfferCard key={o.offerId} offer={o} />
                ))}
              </div>
            ) : (
              <div className="grid gap-3">
                {lists[tab].map((j: any) => (
                  <Link key={j.id} to="/m/provider/jobs/$id" params={{ id: j.id }}>
                    <Card>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-wider text-primary">
                            {j.category}
                          </p>
                          <p className="truncate text-sm font-semibold">{j.address}</p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" /> {when(j.scheduled_for)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <Pill tone={tab === "active" ? "primary" : "muted"}>
                            {statusLabel(j.status)}
                          </Pill>
                          {j.price != null && (
                            <p className="mt-1 text-xs font-semibold">{money(j.price)}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </Section>
        </PullToRefresh>
      </Screen>
    </>
  );
}

function useCountdown(iso: string) {
  const [left, setLeft] = useState(() =>
    Math.max(0, Math.floor((+new Date(iso) - Date.now()) / 1000)),
  );
  useEffect(() => {
    const t = setInterval(
      () => setLeft(Math.max(0, Math.floor((+new Date(iso) - Date.now()) / 1000))),
      1000,
    );
    return () => clearInterval(t);
  }, [iso]);
  return left;
}

function OfferCard({ offer }: { offer: any }) {
  const qc = useQueryClient();
  const respond = useServerFn(respondToOffer);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const seconds = useCountdown(offer.expiresAt);

  const act = async (action: "accept" | "decline") => {
    setBusy(action);
    try {
      await respond({ data: { offerId: offer.offerId, action } });
      toast.success(action === "accept" ? "Job accepted" : "Offer declined");
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not respond");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-primary">
            {offer.booking.category}
          </p>
          <p className="truncate text-sm font-semibold">{offer.booking.address}</p>
          {offer.booking.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {offer.booking.description}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {offer.booking.customerName} · {when(offer.booking.scheduledFor)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <Pill tone={seconds > 20 ? "primary" : "danger"}>
            <Timer className="size-3" /> {seconds}s
          </Pill>
          {(offer.booking.price ?? offer.booking.budget) != null && (
            <p className="mt-1 text-sm font-semibold">
              {money(offer.booking.price ?? offer.booking.budget)}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <GhostButton onClick={() => void act("decline")}>
          {busy === "decline" ? "…" : "Decline"}
        </GhostButton>
        <PrimaryButton loading={busy === "accept"} onClick={() => void act("accept")}>
          Accept
        </PrimaryButton>
      </div>
    </Card>
  );
}
