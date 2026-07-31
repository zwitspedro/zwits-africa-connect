import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BadgeCheck, MapPin, Star, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Reveal } from "./reveal";

type Row = {
  id: string;
  business_name: string;
  category: string;
  city: string;
  hourly_rate: number;
  rating_avg: number;
  ratings_count: number;
  jobs_completed: number;
  verified: boolean;
  available: boolean;
};

/** Featured / nearby providers — trust signals shown before the customer books. */
export function FeaturedProviders() {
  const { data, isLoading } = useQuery({
    queryKey: ["featured-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id, business_name, category, city, hourly_rate, rating_avg, ratings_count, jobs_completed, verified, available")
        .eq("verification_status", "approved")
        .order("rating_avg", { ascending: false })
        .order("jobs_completed", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as Row[];
    },
  });

  const providers = data ?? [];

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <Reveal>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
          <div className="min-w-0">
            <p className="text-[12px] uppercase tracking-[0.22em] text-gold">Nearby &amp; featured</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.03em] md:text-4xl">
              Top-rated professionals
            </h2>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Verified, rated and ready. See the trust signals before you book.
            </p>
          </div>
          <Link
            to="/services"
            className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-primary/50 hover:text-primary"
          >
            Browse all
          </Link>
        </div>
      </Reveal>

      {isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading providers…</p>}

      {!isLoading && providers.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            New providers are joining daily — start a booking and we&apos;ll match you with the
            closest verified professional.
          </p>
          <Link
            to="/services"
            className="mt-4 inline-block rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Book a service
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((p, i) => (
          <Reveal key={p.id} delay={i * 50}>
            <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-soft hover-lift">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 font-display text-base font-bold text-primary">
                  {p.business_name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{p.business_name}</span>
                    {p.verified && <BadgeCheck className="size-4 shrink-0 text-gold" />}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{p.city}</span>
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    p.available ? "bg-gold/12 text-gold" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.available ? "Online" : "Offline"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-3 text-center">
                <Stat label="Rating" value={`${Number(p.rating_avg).toFixed(1)}★`} />
                <Stat label="Jobs" value={String(p.jobs_completed)} />
                <Stat label="Rate" value={`$${Number(p.hourly_rate).toFixed(0)}`} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
                  <Star className="size-3 text-gold" /> {p.ratings_count} reviews
                </span>
                {p.jobs_completed >= 50 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                    <Trophy className="size-3" /> Top Provider
                  </span>
                )}
              </div>

              <Link
                to="/services/$slug"
                params={{ slug: p.category }}
                className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                View &amp; book <ArrowUpRight className="size-4" />
              </Link>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-sm font-bold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
