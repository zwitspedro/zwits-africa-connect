import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Power, ShieldAlert, ShieldX, Star, ChevronRight } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";
import { useProviderTracking } from "@/hooks/use-provider-tracking";
import { useProviderData, type ProviderData } from "@/components/provider/use-provider-data";
import { Panel, EmptyState, MetricBar } from "@/components/provider/dashboard-kit";
import type { SectionKey } from "@/components/provider/dashboard-nav";
import { TABS, BottomTabs, SideTabs, SubTabs, tabForSection, type TabKey } from "@/components/provider/portal-tabs";
import { ActiveJobsSection } from "@/components/provider/active-jobs-section";
import { AvailableJobsSection } from "@/components/provider/available-jobs-section";
import { AvailableJobs } from "@/components/provider/available-jobs";
import { CompletedJobsSection } from "@/components/provider/completed-jobs-section";
import { MessagesSection } from "@/components/provider/messages-section";
import { ScheduleSection } from "@/components/provider/schedule-section";
import { EarningsSection } from "@/components/provider/earnings-section";
import { WalletSection } from "@/components/provider/wallet-section";
import { ReviewsSection } from "@/components/provider/reviews-section";
import { GrowthSection } from "@/components/provider/growth/growth-section";
import { PerformanceSection } from "@/components/provider/performance-section";
import { NotificationsSection } from "@/components/provider/notifications-section";
import { ProfileSection } from "@/components/provider/profile-section";
import { DocumentsSection } from "@/components/provider/documents-section";
import { SupportSection } from "@/components/provider/support-section";
import { SettingsSection } from "@/components/provider/settings-section";
import { RouteSection } from "@/components/provider/route-section";
import { ServiceAreaSection } from "@/components/provider/service-area-section";
import { PayoutSection } from "@/components/provider/payout-section";
import { VehicleInfoSection } from "@/components/provider/vehicle-info-section";
import { OnboardingPanel } from "@/components/provider/onboarding-panel";

import { RoleGate } from "@/components/portal/role-gate";

export const Route = createFileRoute("/_authenticated/provider/")({
  head: () => ({
    meta: [
      { title: "Provider dashboard — Zwits" },
      { name: "description", content: "Go online, accept jobs, track earnings and manage your Zwits provider business." },
      { property: "og:title", content: "Provider dashboard — Zwits" },
      { property: "og:description", content: "Go online, accept jobs, track earnings and manage your Zwits provider business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProviderRoute,
});

function ProviderRoute() {
  return (
    <RoleGate role="provider">
      <ProviderDashboard />
    </RoleGate>
  );
}

function TrackingBridge({ bookingId }: { bookingId: string | null }) {
  useProviderTracking({ bookingId, enabled: !!bookingId });
  return null;
}

function ProviderDashboard() {
  const data = useProviderData();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("home");
  const [section, setSection] = useState<SectionKey>("home");

  const { provider, profile, active, notifications, isLoading } = data;
  const trackingJob = active.find((j: any) => j.status === "in_progress") ?? null;
  const unread = notifications.filter((n: any) => !n.read_at).length;

  const toggleAvailable = useMutation({
    mutationFn: async (available: boolean) => {
      const { error } = await supabase.from("providers").update({ available }).eq("id", provider!.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v ? "You're online — offers incoming" : "You're offline");
      qc.invalidateQueries({ queryKey: ["my-provider"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update"),
  });

  const sectionBadges: Partial<Record<SectionKey, number>> = {
    active: active.length || undefined,
    notifications: unread || undefined,
  };
  const tabBadges: Partial<Record<TabKey, number>> = {
    jobs: active.length || undefined,
    profile: unread || undefined,
  };

  const goto = (t: TabKey, s: SectionKey) => {
    setTab(t);
    setSection(s);
  };
  const openTab = (t: TabKey) => goto(t, TABS.find((x) => x.key === t)!.sections[0].key);
  const jumpTo = (s: SectionKey) => goto(tabForSection(s), s);

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
          <Link to="/provider/setup" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">
            Get started
          </Link>
        </div>
      </SiteShell>
    );
  }

  const revoked = provider.verification_status === "revoked";
  const currentTab = TABS.find((t) => t.key === tab)!;

  return (
    <SiteShell>
      <TrackingBridge bookingId={trackingJob?.id ?? null} />

      <div className="mx-auto max-w-7xl px-4 pb-32 pt-4 lg:pb-16 lg:pt-6">
        <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/25 to-gold/20 font-display text-base font-bold">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="size-full object-cover" />
            ) : (
              (provider.business_name ?? "Z").slice(0, 1).toUpperCase()
            )}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-black sm:text-2xl">{provider.business_name}</h1>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              {provider.verification_status === "approved" ? (
                <span className="inline-flex items-center gap-1 text-emerald-500">
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

        <div className="mt-5 flex gap-8">
          <SideTabs currentTab={tab} currentSection={section} onSelect={goto} badges={sectionBadges} />

          <main className="min-w-0 flex-1 space-y-4">
            <SubTabs tab={currentTab} current={section} onChange={setSection} badges={sectionBadges} />

            {section === "home" && (
              <>
                {!data.onboarding.ready && (
                  <OnboardingPanel
                    steps={data.onboarding.steps}
                    completed={data.onboarding.completed}
                    total={data.onboarding.total}
                    next={data.onboarding.next}
                    onGo={(s) => jumpTo(s)}
                  />
                )}
                <HomeSection
                  data={data}
                  online={!!provider.available}
                  busy={toggleAvailable.isPending || revoked}
                  onToggle={() => toggleAvailable.mutate(!provider.available)}
                  onNavigate={jumpTo}
                />
              </>
            )}
            {section === "available" && <AvailableJobsSection online={!!provider.available} />}
            {section === "active" && <ActiveJobsSection jobs={active} />}
            {section === "route" && <RouteSection jobs={active} />}
            {section === "completed" && <CompletedJobsSection data={data} />}
            {section === "schedule" && <ScheduleSection jobs={data.jobs} />}
            {section === "earnings" && <EarningsSection data={data} />}
            {section === "wallet" && <WalletSection data={data} />}
            {section === "payout" && <PayoutSection data={data} />}
            {section === "messages" && <MessagesSection />}
            {section === "reviews" && <ReviewsSection data={data} />}
            {section === "performance" && <PerformanceSection data={data} />}
            {section === "growth" && <GrowthSection data={data} />}
            {section === "notifications" && <NotificationsSection notifications={notifications} />}
            {section === "profile" && <ProfileSection data={data} />}
            {section === "documents" && <DocumentsSection data={data} />}
            {section === "vehicle" && <VehicleInfoSection data={data} />}
            {section === "area" && <ServiceAreaSection data={data} />}
            {section === "support" && <SupportSection />}
            {section === "settings" && <SettingsSection data={data} />}
          </main>
        </div>
      </div>

      <BottomTabs current={tab} onChange={openTab} badges={tabBadges} />
    </SiteShell>
  );
}

function HomeSection({
  data,
  online,
  busy,
  onToggle,
  onNavigate,
}: {
  data: ProviderData;
  online: boolean;
  busy: boolean;
  onToggle: () => void;
  onNavigate: (k: SectionKey) => void;
}) {
  const { earnings, active, performance, provider, completed, jobs } = data;

  const doneToday = useMemo(
    () =>
      completed.filter(
        (j: any) =>
          new Date(j.completed_at ?? j.updated_at ?? j.created_at).toDateString() === new Date().toDateString(),
      ).length,
    [completed],
  );

  const todayJobs = useMemo(
    () =>
      jobs.filter(
        (j: any) => j.scheduled_for && new Date(j.scheduled_for).toDateString() === new Date().toDateString(),
      ),
    [jobs],
  );

  return (
    <div className="grid gap-4">
      {/* Big online switch */}
      <button
        onClick={onToggle}
        disabled={busy}
        className={`relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 overflow-hidden rounded-3xl border p-5 text-left transition-all duration-300 disabled:opacity-60 ${
          online
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-border/70 bg-card/60"
        }`}
      >
        <span
          className={`grid size-14 place-items-center rounded-full transition-all ${
            online ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"
          }`}
        >
          <Power className="size-6" />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-xl font-bold">{online ? "You're online" : "You're offline"}</span>
          <span className="block text-sm text-muted-foreground">
            {online ? "Receiving job offers nearby" : "Tap to start receiving jobs"}
          </span>
        </span>
        <span
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
            online ? "bg-emerald-500" : "bg-muted"
          }`}
        >
          <span
            className={`absolute top-1 size-6 rounded-full bg-background shadow transition-all duration-300 ${
              online ? "left-7" : "left-1"
            }`}
          />
        </span>
      </button>

      {/* Key numbers */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <BigStat label="Today's earnings" value={`$${earnings.today.toFixed(2)}`} tone="positive" />
        <BigStat label="Jobs today" value={doneToday} />
        <BigStat
          label="Rating"
          value={`${Number(provider?.rating_avg ?? 0).toFixed(1)}`}
          sub={`${provider?.ratings_count ?? 0} reviews`}
          tone="gold"
          icon={<Star className="size-4 fill-gold text-gold" />}
        />
        <BigStat
          label="Acceptance"
          value={performance.acceptanceRate == null ? "—" : `${performance.acceptanceRate.toFixed(0)}%`}
          tone="primary"
        />
      </div>

      {/* Nearby requests — accept in one tap */}
      <Panel
        title="Nearby job requests"
        description={online ? "Respond before the timer runs out" : "Go online to receive offers"}
        action={
          <button onClick={() => onNavigate("available")} className="inline-flex items-center gap-1 text-xs text-primary">
            See all <ChevronRight className="size-3.5" />
          </button>
        }
      >
        <AvailableJobs />
      </Panel>

      {active.length > 0 && (
        <Panel
          title="Active jobs"
          description={`${active.length} in progress`}
          action={
            <button onClick={() => onNavigate("active")} className="inline-flex items-center gap-1 text-xs text-primary">
              Open <ChevronRight className="size-3.5" />
            </button>
          }
        >
          <ul className="grid gap-2">
            {active.slice(0, 3).map((j: any) => (
              <li key={j.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate capitalize">{j.category}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{j.address}</span>
                </span>
                <span className="text-[11px] capitalize text-muted-foreground">{String(j.status).replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Today's schedule" description={`${todayJobs.length} job(s) scheduled`}>
          {todayJobs.length === 0 ? (
            <EmptyState title="Nothing scheduled today." hint="Stay online to pick up instant jobs." />
          ) : (
            <ul className="grid gap-2">
              {todayJobs.map((j: any) => (
                <li key={j.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate capitalize">{j.category} — {j.address}</div>
                    <div className="text-[11px] capitalize text-muted-foreground">{String(j.status).replace("_", " ")}</div>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {new Date(j.scheduled_for).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Performance"
          action={
            <button onClick={() => onNavigate("performance")} className="inline-flex items-center gap-1 text-xs text-primary">
              Details <ChevronRight className="size-3.5" />
            </button>
          }
        >
          <div className="grid gap-4">
            <MetricBar label="Acceptance rate" value={performance.acceptanceRate} />
            <MetricBar label="Completion rate" value={performance.completionRate} />
            <MetricBar label="Response rate" value={performance.responseRate} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function BigStat({
  label,
  value,
  sub,
  tone = "default",
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "primary" | "gold" | "positive";
  icon?: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    primary: "text-primary",
    gold: "text-gold",
    positive: "text-emerald-500",
  };
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label} {icon}
      </div>
      <div className={`mt-1.5 font-display text-2xl font-bold tabular-nums ${tones[tone]}`}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
