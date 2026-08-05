import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronRight, Gift, Heart, MapPin, Settings, Star, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMobileProfile } from "@/mobile/profile";
import { AppBar, Card, Screen, Section, StatTile, money } from "@/mobile/ui";

export const Route = createFileRoute("/m/customer/profile")({ component: CustomerProfile });

const LINKS = [
  { to: "/m/customer/favourites", label: "Favourite providers", icon: Heart },
  { to: "/m/customer/addresses", label: "Saved addresses", icon: MapPin },
  { to: "/m/customer/wallet", label: "Wallet", icon: Wallet },
  { to: "/m/customer/referrals", label: "Invite & earn", icon: Gift },
  { to: "/m/notifications", label: "Notifications", icon: Bell },
  { to: "/m/settings", label: "Settings", icon: Settings },
] as const;

function CustomerProfile() {
  const { user } = useAuth();
  const { profile } = useMobileProfile(user?.id);

  const stats = useQuery({
    queryKey: ["m", "customer-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [bookings, ratings] = await Promise.all([
        supabase.from("bookings").select("status, price").eq("customer_id", user!.id).limit(500),
        supabase.from("ratings").select("rating").eq("customer_id", user!.id).limit(500),
      ]);
      const rows = bookings.data ?? [];
      const completed = rows.filter((b) => b.status === "completed");
      const spend = completed.reduce((t, b) => t + Number(b.price ?? 0), 0);
      const given = ratings.data ?? [];
      return {
        completed: completed.length,
        spend,
        reviews: given.length,
        avgGiven: given.length ? given.reduce((t, r) => t + r.rating, 0) / given.length : 0,
      };
    },
  });

  return (
    <>
      <AppBar title="Profile" />
      <Screen>
        <Section>
          <Card>
            <div className="flex items-center gap-4">
              <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-3xl bg-primary/12 font-display text-xl font-bold text-primary">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  (profile?.display_name ?? user?.email ?? "Z").slice(0, 1).toUpperCase()
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold">
                  {profile?.display_name ?? "Zwits customer"}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                {profile?.phone && <p className="text-xs text-muted-foreground">{profile.phone}</p>}
              </div>
            </div>
          </Card>
        </Section>

        <Section title="Your activity">
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Jobs completed" value={stats.data?.completed ?? 0} />
            <StatTile label="Total spent" value={money(stats.data?.spend)} />
            <StatTile label="Reviews left" value={stats.data?.reviews ?? 0} icon={Star} />
            <StatTile
              label="Average given"
              value={(stats.data?.avgGiven ?? 0).toFixed(1)}
              icon={Star}
            />
          </div>
        </Section>

        <Section title="Manage">
          <Card className="divide-y divide-border/60 p-0">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="flex min-h-14 items-center gap-3 px-4 text-sm active:bg-muted"
              >
                <l.icon className="size-4 text-muted-foreground" />
                <span className="flex-1">{l.label}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </Card>
        </Section>
      </Screen>
    </>
  );
}
