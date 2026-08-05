import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFavouriteProviders } from "@/mobile/local";
import { AppBar, Empty, Screen, Section, SkeletonList } from "@/mobile/ui";
import { ProviderRow } from "./m.customer.index";

export const Route = createFileRoute("/m/customer/favourites")({ component: Favourites });

function Favourites() {
  const { favourites, loading } = useFavouriteProviders();

  const providers = useQuery({
    queryKey: ["m", "favourite-providers", favourites.join(",")],
    enabled: favourites.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select(
          "id, business_name, category, city, hourly_rate, rating_avg, ratings_count, jobs_completed, verified, available",
        )
        .in("id", favourites);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <>
      <AppBar title="Favourites" subtitle="Providers you keep coming back to" back />
      <Screen>
        <Section>
          {loading || providers.isLoading ? (
            <SkeletonList rows={3} />
          ) : (providers.data ?? []).length === 0 ? (
            <Empty
              icon={Heart}
              title="No favourites yet"
              hint="Tap the heart on a provider profile to save them here."
            />
          ) : (
            <div className="grid gap-3">
              {(providers.data ?? []).map((p) => (
                <ProviderRow key={p.id} p={p} favourite />
              ))}
            </div>
          )}
        </Section>
      </Screen>
    </>
  );
}
