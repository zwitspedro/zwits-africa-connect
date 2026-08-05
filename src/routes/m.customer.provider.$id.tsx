import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Heart, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFavouriteProviders } from "@/mobile/local";
import {
  AppBar,
  Card,
  Empty,
  Pill,
  PrimaryButton,
  Screen,
  Section,
  SkeletonList,
  money,
} from "@/mobile/ui";

export const Route = createFileRoute("/m/customer/provider/$id")({ component: ProviderProfile });

function ProviderProfile() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isFavourite, toggle } = useFavouriteProviders();

  const provider = useQuery({
    queryKey: ["m", "provider", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select(
          "id, business_name, category, city, bio, hourly_rate, rating_avg, ratings_count, jobs_completed, verified, available, verification_status",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const reviews = useQuery({
    queryKey: ["m", "provider-reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ratings")
        .select("id, rating, review, created_at")
        .eq("provider_id", id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const p = provider.data as any;

  return (
    <>
      <AppBar title={p?.business_name ?? "Provider"} back />
      <Screen>
        <Section>
          {provider.isLoading ? (
            <SkeletonList rows={2} />
          ) : !p ? (
            <Empty title="Provider unavailable" hint="This profile is no longer listed." />
          ) : (
            <>
              <Card>
                <div className="flex items-start gap-4">
                  <span className="grid size-16 shrink-0 place-items-center rounded-3xl bg-primary/12 font-display text-xl font-bold text-primary">
                    {String(p.business_name).slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate font-display text-lg font-semibold">
                        {p.business_name}
                      </h2>
                      {p.verified && <BadgeCheck className="size-4 text-accent" />}
                    </div>
                    <p className="truncate text-xs capitalize text-muted-foreground">
                      {p.category} · {p.city}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Pill tone="warning">
                        <Star className="size-3 fill-current" />{" "}
                        {Number(p.rating_avg ?? 0).toFixed(1)} ({p.ratings_count ?? 0})
                      </Pill>
                      <Pill>{p.jobs_completed ?? 0} jobs done</Pill>
                      <Pill tone={p.available ? "accent" : "muted"}>
                        {p.available ? "Accepting work" : "Busy"}
                      </Pill>
                    </div>
                  </div>
                  <button
                    aria-label="Toggle favourite"
                    onClick={() => void toggle(p.id)}
                    className="grid size-11 shrink-0 place-items-center rounded-full active:bg-muted"
                  >
                    <Heart
                      className={`size-5 ${isFavourite(p.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`}
                    />
                  </button>
                </div>
                {p.bio && <p className="mt-4 text-sm text-muted-foreground">{p.bio}</p>}
                <p className="mt-3 text-sm font-semibold">{money(p.hourly_rate)} / hour</p>
                <div className="mt-4">
                  <PrimaryButton
                    onClick={() =>
                      navigate({
                        to: "/m/customer/book/$category",
                        params: { category: p.category },
                        search: { provider: p.id } as never,
                      })
                    }
                  >
                    Book {p.business_name}
                  </PrimaryButton>
                </div>
              </Card>

              <Section title="Reviews" className="px-0">
                {reviews.isLoading ? (
                  <SkeletonList rows={2} />
                ) : (reviews.data ?? []).length === 0 ? (
                  <Empty
                    icon={Star}
                    title="No reviews yet"
                    hint="Be the first to rate this provider."
                  />
                ) : (
                  <div className="grid gap-3">
                    {(reviews.data ?? []).map((r: any) => (
                      <Card key={r.id}>
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`size-3.5 ${i < r.rating ? "fill-current" : "opacity-30"}`}
                            />
                          ))}
                          <span className="ml-2 text-[10px] text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {r.review && (
                          <p className="mt-2 text-sm text-muted-foreground">{r.review}</p>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </Section>
            </>
          )}
        </Section>
      </Screen>
    </>
  );
}
