import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  ChevronRight,
  FileText,
  LogOut,
  Settings,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProviderData } from "@/components/provider/use-provider-data";
import { clearOfflineCache } from "@/mobile/offline";
import {
  AppBar,
  Card,
  GhostButton,
  Pill,
  Screen,
  Section,
  SkeletonList,
  StatTile,
  money,
} from "@/mobile/ui";

export const Route = createFileRoute("/m/provider/profile")({ component: ProviderProfile });

function ProviderProfile() {
  const data = useProviderData();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const provider: any = data.provider;

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    clearOfflineCache();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <>
      <AppBar title="Profile" large />
      <Screen>
        {data.isLoading ? (
          <Section>
            <SkeletonList rows={3} />
          </Section>
        ) : (
          <>
            <Section>
              <Card>
                <div className="flex items-center gap-4">
                  <span className="grid size-16 place-items-center rounded-3xl bg-primary/12 font-display text-xl font-bold text-primary">
                    {(provider?.business_name ?? "Z").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold">
                      {provider?.business_name ?? "Your business"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {provider?.category} · {provider?.city}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Pill
                        tone={provider?.verification_status === "approved" ? "accent" : "warning"}
                      >
                        <BadgeCheck className="size-3" />{" "}
                        {String(provider?.verification_status ?? "pending").replace(/_/g, " ")}
                      </Pill>
                    </div>
                  </div>
                </div>
              </Card>
            </Section>

            <Section title="Performance">
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  label="Rating"
                  value={Number(provider?.rating_avg ?? 0).toFixed(1)}
                  hint={`${provider?.ratings_count ?? 0} reviews`}
                  icon={Star}
                />
                <StatTile
                  label="Completion"
                  value={
                    data.performance.completionRate != null
                      ? `${Math.round(data.performance.completionRate)}%`
                      : "—"
                  }
                  icon={TrendingUp}
                />
                <StatTile label="Lifetime net" value={money(data.earnings.net)} icon={Wallet} />
                <StatTile label="Jobs done" value={provider?.jobs_completed ?? 0} />
              </div>
            </Section>

            <Section title="Business">
              <Card className="divide-y divide-border/60 p-0">
                <Row to="/provider/dashboard" icon={FileText} label="Documents & verification" />
                <Row to="/provider/dashboard" icon={Wallet} label="Payouts & wallet" />
                <Row to="/m/settings" icon={Settings} label="App settings" />
              </Card>
            </Section>

            <Section>
              <GhostButton onClick={() => void signOut()}>
                <LogOut className="size-4" /> Sign out
              </GhostButton>
            </Section>
          </>
        )}
      </Screen>
    </>
  );
}

function Row({ to, icon: Icon, label }: { to: string; icon: typeof FileText; label: string }) {
  return (
    <Link to={to} className="flex min-h-14 items-center gap-3 px-4">
      <Icon className="size-4 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
