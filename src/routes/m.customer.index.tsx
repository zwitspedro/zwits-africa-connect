import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Heart, MapPin, Search, Star, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { services, popularServices } from "@/data/services";
import { useMobileProfile } from "@/mobile/profile";
import { useUnreadCount } from "@/mobile/notifications";
import { useFavouriteProviders } from "@/mobile/local";
import { qk } from "@/mobile/api";
import {
  AppBar,
  Card,
  Empty,
  Pill,
  PullToRefresh,
  Screen,
  Section,
  SkeletonList,
  Skeleton,
  money,
} from "@/mobile/ui";
import { CUSTOMER_STATUS_COPY, type JobStatus } from "@/lib/job-lifecycle";

export const Route = createFileRoute("/m/customer/")({ component: CustomerHome });

function CustomerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profile } = useMobileProfile(user?.id);
  const unread = useUnreadCount(user?.id);
  const { favourites } = useFavouriteProviders();
  const [q, setQ] = useState("");

  const providers = useQuery({
    queryKey: ["m", "providers", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select(
          "id, business_name, category, city, hourly_rate, rating_avg, ratings_count, jobs_completed, verified, available",
        )
        .eq("verification_status", "approved")
        .order("rating_avg", { ascending: false })
        .order("jobs_completed", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const active = useQuery({
    queryKey: [...qk.bookings(user?.id ?? ""), "active"],
    enabled: !!user,
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, category, address, status, scheduled_for, price")
        .eq("customer_id", user!.id)
        .not("status", "in", "(completed,cancelled)")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
  });

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return services
      .filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.examples.some((e) => e.toLowerCase().includes(term)),
      )
      .slice(0, 6);
  }, [q]);

  const nearby = (providers.data ?? [])
    .filter((p) => ((profile as any)?.city ? true : true))
    .slice(0, 6);
  const favourite = (providers.data ?? []).filter((p) => favourites.includes(p.id));

  return (
    <>
      <AppBar
        large
        title={`Hi${profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""} 👋`}
        subtitle="What do you need done today?"
        right={
          <Link
            to="/m/notifications"
            aria-label="Notifications"
            className="relative grid size-11 place-items-center rounded-full active:bg-muted"
          >
            <Bell className="size-5" />
            {!!unread && (
              <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />
            )}
          </Link>
        }
      />
      <Screen>
        <PullToRefresh
          onRefresh={async () => void (await Promise.all([providers.refetch(), active.refetch()]))}
        >
          <div className="px-4 pt-4">
            <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-border bg-card px-4">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search plumbing, cleaning, delivery…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            {matches.length > 0 && (
              <div className="mt-2 grid gap-1 rounded-2xl border border-border bg-card p-2">
                {matches.map((s) => (
                  <button
                    key={s.slug}
                    onClick={() =>
                      navigate({ to: "/m/customer/book/$category", params: { category: s.slug } })
                    }
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm active:bg-muted"
                  >
                    <s.icon className="size-4 text-primary" />
                    <span className="flex-1 truncate">{s.name}</span>
                    <span className="text-xs text-muted-foreground">
                      from {money(s.estimate.from)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {(active.data ?? []).length > 0 && (
            <Section title="Happening now">
              <div className="grid gap-3">
                {(active.data ?? []).map((b: any) => (
                  <Card
                    key={b.id}
                    onClick={() => navigate({ to: "/m/customer/track/$id", params: { id: b.id } })}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wider text-primary">
                          {b.category}
                        </p>
                        <p className="truncate text-sm font-semibold">{b.address}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {CUSTOMER_STATUS_COPY[b.status as JobStatus] ?? b.status}
                        </p>
                      </div>
                      <Pill tone="primary">Track</Pill>
                    </div>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          <Section
            title="Popular services"
            action={
              <Link to="/m/customer/categories" className="text-xs text-primary">
                See all
              </Link>
            }
          >
            <div className="grid grid-cols-4 gap-3">
              {popularServices.slice(0, 8).map((s) => (
                <button
                  key={s.slug}
                  onClick={() =>
                    navigate({ to: "/m/customer/book/$category", params: { category: s.slug } })
                  }
                  className="grid gap-1.5 rounded-2xl border border-border/70 bg-card p-2 text-center active:scale-95"
                >
                  <span className="mx-auto grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                    <s.icon className="size-5" />
                  </span>
                  <span className="truncate text-[10px] font-medium">{s.name}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Send a parcel">
            <Card
              onClick={() =>
                navigate({ to: "/m/customer/book/$category", params: { category: "deliveries" } })
              }
            >
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-accent/15 text-accent">
                  <Truck className="size-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Same-day delivery in Harare</p>
                  <p className="text-xs text-muted-foreground">
                    Track your rider live from pickup to drop-off.
                  </p>
                </div>
              </div>
            </Card>
          </Section>

          {favourite.length > 0 && (
            <Section
              title="Your favourites"
              action={
                <Link to="/m/customer/favourites" className="text-xs text-primary">
                  Manage
                </Link>
              }
            >
              <div className="grid gap-3">
                {favourite.slice(0, 3).map((p) => (
                  <ProviderRow key={p.id} p={p} favourite />
                ))}
              </div>
            </Section>
          )}

          <Section title="Top rated near you">
            {providers.isLoading ? (
              <SkeletonList rows={3} />
            ) : nearby.length === 0 ? (
              <Empty
                icon={MapPin}
                title="No providers listed yet"
                hint="New Harare providers are onboarding daily."
              />
            ) : (
              <div className="grid gap-3">
                {nearby.map((p) => (
                  <ProviderRow key={p.id} p={p} />
                ))}
              </div>
            )}
          </Section>

          <Section title="All categories">
            <div className="grid grid-cols-2 gap-3">
              {services.slice(0, 6).map((s) => (
                <Card
                  key={s.slug}
                  onClick={() =>
                    navigate({ to: "/m/customer/book/$category", params: { category: s.slug } })
                  }
                >
                  <s.icon className="size-5 text-primary" />
                  <p className="mt-2 text-sm font-semibold">{s.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{s.tagline}</p>
                </Card>
              ))}
            </div>
          </Section>

          {providers.isLoading && (
            <div className="px-4 pt-4">
              <Skeleton className="h-4 w-24" />
            </div>
          )}
        </PullToRefresh>
      </Screen>
    </>
  );
}

export function ProviderRow({ p, favourite }: { p: any; favourite?: boolean }) {
  const navigate = useNavigate();
  return (
    <Card onClick={() => navigate({ to: "/m/customer/provider/$id", params: { id: p.id } })}>
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/12 font-display text-base font-bold text-primary">
          {String(p.business_name ?? "Z")
            .slice(0, 1)
            .toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold">{p.business_name}</p>
            {favourite && <Heart className="size-3.5 fill-destructive text-destructive" />}
          </div>
          <p className="truncate text-xs capitalize text-muted-foreground">
            {p.category} · {p.city}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-amber-500">
              <Star className="size-3 fill-current" />
              {Number(p.rating_avg ?? 0).toFixed(1)}
            </span>
            <span>· {p.jobs_completed ?? 0} jobs</span>
          </div>
        </div>
        <span className="shrink-0 text-xs font-semibold">{money(p.hourly_rate)}/h</span>
      </div>
    </Card>
  );
}
