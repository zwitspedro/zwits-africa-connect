import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BadgeCheck,
  Bell,
  Briefcase,
  DollarSign,
  Hammer,
  ShieldAlert,
  ShieldX,
  Star,
  TrendingUp,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";
import { useProviderTracking } from "@/hooks/use-provider-tracking";
import { useProviderData, type ProviderData } from "@/components/provider/use-provider-data";
import { Panel, StatCard, EmptyState, MetricBar } from "@/components/provider/dashboard-kit";
import { DesktopNav, MobileTabs, MoreSheet, NAV, type SectionKey } from "@/components/provider/dashboard-nav";
import { ActiveJobsSection } from "@/components/provider/active-jobs-section";
import { AvailableJobsSection } from "@/components/provider/available-jobs-section";
import { ScheduleSection } from "@/components/provider/schedule-section";
import { EarningsSection } from "@/components/provider/earnings-section";
import { WalletSection } from "@/components/provider/wallet-section";
import { ReviewsSection } from "@/components/provider/reviews-section";
import { PerformanceSection } from "@/components/provider/performance-section";
import { NotificationsSection } from "@/components/provider/notifications-section";
import { ProfileSection } from "@/components/provider/profile-section";
import { DocumentsSection } from "@/components/provider/documents-section";
import { SupportSection } from "@/components/provider/support-section";
import { SettingsSection } from "@/components/provider/settings-section";

export const Route = createFileRoute("/_authenticated/provider/")({
  head: () => ({
    meta: [
      { title: "Provider dashboard — Zwits" },
      { name: "description", content: "Manage jobs, earnings, schedule and performance as a Zwits service provider." },
      { property: "og:title", content: "Provider dashboard — Zwits" },
      { property: "og:description", content: "Manage jobs, earnings, schedule and performance as a Zwits service provider." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProviderDashboard,
});

function TrackingBridge({ bookingId }: { bookingId: string | null }) {
  useProviderTracking({ bookingId, enabled: !!bookingId });
  return null;
}

function ProviderDashboard() {
  const data = useProviderData();
  const qc = useQueryClient();
  const [section, setSection] = useState<SectionKey>("home");
  const [moreOpen, setMoreOpen] = useState(false);

  const { provider, profile, active, notifications, isLoading } = data;
  const trackingJob = active.find((j: any) => j.status === "in_progress") ?? null;
  const unread = notifications.filter((n: any) => !n.read_at).length;

  const toggleAvailable = useMutation({
    mutationFn: async (available: boolean) => {
      const { error } = await supabase.from("providers").update({ available }).eq("id", provider!.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v ? "You're online" : "You're offline");
      qc.invalidateQueries({ queryKey: ["my-provider"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update"),
  });

  const badges: Partial<Record<SectionKey, number>> = {
    active: active.length || undefined,
    notifications: unread || undefined,
  };

  if (isLoading) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="h-32 animate-pulse rounded-3xl bg-muted/50" />
        </div>
      </SiteShell>
    );
  }

  if (!provider) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-display text-3xl font-bold">Become a Zwits provider</h1>
          <p className="mt-2 text-muted-foreground">Create your provider profile to start receiving jobs.</p>
          <Link to="/provider/apply" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">
            Get started
          </Link>
        </div>
      </SiteShell>
    );
  }

  const revoked = provider.verification_status === "revoked";

  return (
    <SiteShell>
      <TrackingBridge bookingId={trackingJob?.id ?? null} />

      <div className="mx-auto max-w-7xl px-4 pb-28 pt-6 lg:pb-16">
        {/* Header */}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 to-gold/20 font-display text-lg font-bold">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="size-full object-cover" />
              ) : (
                (provider.business_name ?? "Z").slice(0, 1).toUpperCase()
              )}
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-black sm:text-2xl">{provider.business_name}</h1>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                {provider.verification_status === "approved" ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <BadgeCheck className="size-3.5" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-gold">
                    <ShieldAlert className="size-3.5" /> {String(provider.verification_status).replace("_", " ")}
                  </span>
                )}
                <span>·</span>
                <span className="truncate capitalize">{provider.category} · {provider.city}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => toggleAvailable.mutate(!provider.available)}
            disabled={revoked || toggleAvailable.isPending}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-all disabled:opacity-50 ${
              provider.available
                ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <span className={`size-2 rounded-full ${provider.available ? "animate-pulse bg-emerald-400" : "bg-muted-foreground"}`} />
            {provider.available ? "Online" : "Offline"}
          </button>
        </header>

        {revoked && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <ShieldX className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Your provider account is suspended</p>
              <p className="mt-0.5 text-muted-foreground">{provider.revoke_reason ?? "Contact support to appeal this decision."}</p>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-8">
          <DesktopNav current={section} onChange={setSection} badges={badges} />

          <main className="min-w-0 flex-1">
            {section === "home" && <HomeSection data={data} onNavigate={setSection} />}
            {section === "available" && <AvailableJobsSection online={!!provider.available} />}
            {section === "active" && <ActiveJobsSection jobs={active} />}
            {section === "schedule" && <ScheduleSection jobs={data.jobs} />}
            {section === "earnings" && <EarningsSection data={data} />}
            {section === "wallet" && <WalletSection data={data} />}
            {section === "reviews" && <ReviewsSection data={data} />}
            {section === "performance" && <PerformanceSection data={data} />}
            {section === "notifications" && <NotificationsSection notifications={notifications} />}
            {section === "profile" && <ProfileSection data={data} />}
            {section === "documents" && <DocumentsSection data={data} />}
            {section === "support" && <SupportSection />}
            {section === "settings" && <SettingsSection data={data} />}
          </main>
        </div>
      </div>

      <MobileTabs current={section} onChange={setSection} badges={badges} onMore={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} onChange={setSection} />
    </SiteShell>
  );
}

function HomeSection({ data, onNavigate }: { data: ProviderData; onNavigate: (k: SectionKey) => void }) {
  const { earnings, active, performance, provider, notifications, jobs } = data;

  const todayJobs = useMemo(
    () =>
      jobs.filter(
        (j: any) => j.scheduled_for && new Date(j.scheduled_for).toDateString() === new Date().toDateString(),
      ),
    [jobs],
  );

  const quick = NAV.filter((n) => ["available", "active", "earnings", "wallet", "reviews", "support"].includes(n.key));

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Today's earnings" value={`$${earnings.today.toFixed(2)}`} icon={DollarSign} accent="positive" />
        <StatCard label="This week" value={`$${earnings.week.toFixed(2)}`} icon={TrendingUp} accent="primary" />
        <StatCard label="Active jobs" value={active.length} icon={Hammer} />
        <StatCard label="Rating" value={`${Number(provider?.rating_avg ?? 0).toFixed(1)} ★`} icon={Star} accent="gold" sub={`${provider?.ratings_count ?? 0} reviews`} />
      </div>

      <Panel title="Quick actions">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {quick.map((q) => (
            <button
              key={q.key}
              onClick={() => onNavigate(q.key)}
              className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-background/40 p-2 text-[11px] transition-all hover:-translate-y-0.5 hover:border-primary/40"
            >
              <q.icon className="size-5 text-primary" />
              <span className="text-center leading-tight">{q.label}</span>
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Today's schedule" description={`${todayJobs.length} job(s) scheduled`}>
          {todayJobs.length === 0 ? (
            <EmptyState title="Nothing scheduled today." hint="Go online to pick up instant jobs." />
          ) : (
            <ul className="grid gap-2">
              {todayJobs.map((j: any) => (
                <li key={j.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate capitalize">{j.category} — {j.address}</div>
                    <div className="text-[11px] text-muted-foreground capitalize">{String(j.status).replace("_", " ")}</div>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {new Date(j.scheduled_for).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Performance snapshot" action={<Briefcase className="size-4 text-primary" />}>
          <div className="grid gap-4">
            <MetricBar label="Acceptance rate" value={performance.acceptanceRate} />
            <MetricBar label="Completion rate" value={performance.completionRate} />
            <MetricBar label="Response rate" value={performance.responseRate} />
          </div>
        </Panel>
      </div>

      <Panel
        title="Latest notifications"
        action={
          <button onClick={() => onNavigate("notifications")} className="inline-flex items-center gap-1 text-xs text-primary">
            <Bell className="size-3.5" /> View all
          </button>
        }
      >
        {notifications.length === 0 ? (
          <EmptyState title="You're all caught up." />
        ) : (
          <ul className="grid gap-2">
            {notifications.slice(0, 4).map((n: any) => (
              <li key={n.id} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/40 p-3">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-primary"}`} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{n.title}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
