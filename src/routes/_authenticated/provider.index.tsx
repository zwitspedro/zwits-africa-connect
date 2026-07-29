import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, BadgeCheck, MapPin, ShieldAlert, ShieldX, Clock, MessageSquare } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProviderTracking } from "@/hooks/use-provider-tracking";
import { ProviderJobsMap } from "@/components/provider-jobs-map";
import { AvailableJobs } from "@/components/provider/available-jobs";

export const Route = createFileRoute("/_authenticated/provider/")({
  head: () => ({ meta: [{ title: "Provider dashboard — Zwits" }] }),
  component: ProviderDashboard,
});

type Tab = "jobs" | "active" | "schedule" | "earnings" | "ratings" | "profile";

const TABS: { key: Tab; label: string }[] = [
  { key: "jobs", label: "Available jobs" },
  { key: "active", label: "Active" },
  { key: "schedule", label: "Today" },
  { key: "earnings", label: "Earnings" },
  { key: "ratings", label: "Ratings" },
  { key: "profile", label: "Profile" },
];

function TrackingBridge({ bookingId }: { bookingId: string | null }) {
  useProviderTracking({ bookingId, enabled: !!bookingId });
  return null;
}

function ProviderDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("jobs");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-provider", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: jobs } = useQuery({
    queryKey: ["provider-jobs", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("provider_id", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: rates } = useQuery({
    queryKey: ["commission-rates-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_rates")
        .select("category,percent,min_fee,active")
        .eq("active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["provider-reviews", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ratings")
        .select("id, rating, review, created_at")
        .eq("provider_id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled" }) => {
      const patch: Record<string, unknown> = { status };
      if (status === "completed") patch.completed_at = new Date().toISOString();
      const { error } = await supabase.from("bookings").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["provider-jobs"] });
    },
  });

  const toggleAvailable = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("providers").update({ available: !profile!.available }).eq("id", profile!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-provider"] }),
  });

  if (isLoading) return <SiteShell><div className="p-10 text-sm text-muted-foreground">Loading…</div></SiteShell>;

  if (!profile) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">No provider profile yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">Set one up to start accepting jobs.</p>
          <Link to="/provider/setup" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground">Create profile</Link>
        </section>
      </SiteShell>
    );
  }

  const active = jobs?.filter((j) => ["pending", "accepted", "in_progress"].includes(j.status)) ?? [];
  const completed = jobs?.filter((j) => j.status === "completed") ?? [];
  const ratesByCategory = new Map((rates ?? []).map((r: any) => [r.category, r]));
  const computeFee = (category: string, price: number) => {
    const r: any = ratesByCategory.get(category);
    if (!r) return 0;
    return (price * Number(r.percent)) / 100 + Number(r.min_fee);
  };
  const gross = completed.reduce((s, j) => s + (Number(j.price) || 0), 0);
  const commissionTotal = completed.reduce((s, j) => s + computeFee(j.category, Number(j.price) || 0), 0);
  const earnings = gross - commissionTotal;
  const released = completed
    .filter((j: any) => j.customer_confirmed_at)
    .reduce((s, j) => s + (Number(j.price) || 0) - computeFee(j.category, Number(j.price) || 0), 0);
  const pendingPayout = earnings - released;
  const trackingJob = active.find((j) => j.status === "in_progress");

  const today = new Date();
  const todaysJobs = active
    .filter((j) => j.scheduled_for && new Date(j.scheduled_for).toDateString() === today.toDateString())
    .sort((a, b) => new Date(a.scheduled_for!).getTime() - new Date(b.scheduled_for!).getTime());

  return (
    <SiteShell>
      <TrackingBridge bookingId={trackingJob?.id ?? null} />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-bold">{profile.business_name}</h1>
              {profile.verified && <BadgeCheck className="size-6 text-gold" />}
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="size-4 fill-gold text-gold" /> {Number(profile.rating_avg).toFixed(1)}</span>
              <span>· {profile.category}</span>
              <span>· {profile.city}</span>
            </div>
          </div>
          <button
            onClick={() => toggleAvailable.mutate()}
            className={`rounded-full px-4 py-2 text-sm ${profile.available ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}
          >
            {profile.available ? "Online" : "Offline"}
          </button>
        </div>

        <VerificationBanner status={(profile as any).verification_status} reason={(profile as any).revoke_reason} />

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Active jobs" value={active.length} />
          <Stat label="Completed" value={profile.jobs_completed} />
          <Stat label="Rating" value={`${Number(profile.rating_avg).toFixed(1)} ★`} />
          <Stat label="Net earnings" value={`$${earnings.toFixed(2)}`} sub={`Gross $${gross.toFixed(0)} · Fees $${commissionTotal.toFixed(2)}`} />
        </div>

        <div className="mt-8 flex gap-2 overflow-x-auto border-b border-border pb-px">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-t-lg px-4 py-2 text-sm ${tab === t.key ? "border-b-2 border-primary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "jobs" && (
            <>
              {!profile.available && (
                <p className="mb-3 rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs">
                  You're offline — go online to receive first-wave job offers.
                </p>
              )}
              <AvailableJobs />
            </>
          )}

          {tab === "active" && (
            <>
              <ProviderJobsMap jobs={active} />
              <ul className="mt-4 grid gap-3">
                {active.length === 0 && <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No active jobs.</li>}
                {active.map((j) => (
                  <li key={j.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-primary">{j.category} · {j.status}</div>
                        <div className="mt-1 font-medium">{j.address}</div>
                        {j.description && <div className="mt-1 text-sm text-muted-foreground">{j.description}</div>}
                        <Link
                          to="/messages/$bookingId"
                          params={{ bookingId: j.id }}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <MessageSquare className="size-3" /> Chat with customer
                        </Link>
                      </div>
                      <div className="flex flex-col gap-2">
                        {j.status === "pending" && (
                          <button onClick={() => updateStatus.mutate({ id: j.id, status: "accepted" })} className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground">Accept</button>
                        )}
                        {j.status === "accepted" && (
                          <button onClick={() => updateStatus.mutate({ id: j.id, status: "in_progress" })} className="rounded-full bg-gold px-3 py-1.5 text-xs text-background">Start</button>
                        )}
                        {j.status === "in_progress" && (
                          <>
                            <span className="inline-flex items-center gap-1 self-end rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                              <MapPin className="size-3" /> Sharing live location
                            </span>
                            <button onClick={() => updateStatus.mutate({ id: j.id, status: "completed" })} className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs text-background">Mark complete</button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {tab === "schedule" && (
            <ul className="grid gap-2">
              {todaysJobs.length === 0 && (
                <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing scheduled for today.</li>
              )}
              {todaysJobs.map((j) => (
                <li key={j.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium tabular-nums">{new Date(j.scheduled_for!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    <div className="truncate text-xs text-muted-foreground">{j.category} — {j.address}</div>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize">{j.status.replace("_", " ")}</span>
                </li>
              ))}
            </ul>
          )}

          {tab === "earnings" && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Wallet (released)" value={`$${released.toFixed(2)}`} sub="Customer confirmed" />
                <Stat label="Pending release" value={`$${pendingPayout.toFixed(2)}`} sub="Awaiting confirmation" />
                <Stat label="Platform fees" value={`$${commissionTotal.toFixed(2)}`} sub="Lifetime" />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Net payout = price − platform commission (latest configured rates).</p>
              <ul className="mt-3 grid gap-2">
                {completed.slice(0, 20).map((j) => {
                  const price = Number(j.price) || 0;
                  const fee = computeFee(j.category, price);
                  const net = price - fee;
                  const r: any = ratesByCategory.get(j.category);
                  return (
                    <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 text-sm">
                      <div className="min-w-0">
                        <div className="truncate">{j.category} — {j.address}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(j.updated_at).toLocaleDateString()} · ${price.toFixed(2)} gross
                          {r ? ` · ${Number(r.percent).toFixed(1)}% + $${Number(r.min_fee).toFixed(2)} fee` : " · no rate set"}
                          {(j as any).customer_confirmed_at ? " · released" : " · pending confirmation"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">−${fee.toFixed(2)}</div>
                        <div className="font-semibold">${net.toFixed(2)}</div>
                      </div>
                    </li>
                  );
                })}
                {completed.length === 0 && <li className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No completed jobs yet.</li>}
              </ul>
            </>
          )}

          {tab === "ratings" && (
            <ul className="grid gap-2">
              {(reviews ?? []).length === 0 && (
                <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No reviews yet.</li>
              )}
              {(reviews ?? []).map((r: any) => (
                <li key={r.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`size-4 ${n <= r.rating ? "fill-gold text-gold" : "text-muted-foreground/40"}`} />
                    ))}
                    <span className="ml-2 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.review && <p className="mt-1.5 text-sm text-muted-foreground">{r.review}</p>}
                </li>
              ))}
            </ul>
          )}

          {tab === "profile" && (
            <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 text-sm">
              <Row label="Business" value={profile.business_name} />
              <Row label="Category" value={profile.category} />
              <Row label="City" value={profile.city} />
              <Row label="Hourly rate" value={`$${Number(profile.hourly_rate).toFixed(2)}`} />
              <Row label="Verification" value={String((profile as any).verification_status).replace("_", " ")} />
              <Row label="Availability" value={profile.available ? "Online" : "Offline"} />
              <Link to="/provider/setup" className="justify-self-start rounded-full bg-primary px-5 py-2.5 text-xs font-medium text-primary-foreground">
                Edit profile & documents
              </Link>
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/80">{sub}</div>}
    </div>
  );
}

function VerificationBanner({ status, reason }: { status?: string; reason?: string | null }) {
  if (status === "approved") return null;
  if (status === "revoked") {
    return (
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        <ShieldX className="mt-0.5 size-5 text-destructive" />
        <div className="flex-1">
          <div className="font-medium">Verification revoked</div>
          <p className="text-muted-foreground">{reason || "An admin revoked your verification. Please contact support."}</p>
        </div>
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm">
        <Clock className="mt-0.5 size-5 text-gold" />
        <div className="flex-1">
          <div className="font-medium">Verification pending</div>
          <p className="text-muted-foreground">We're reviewing your documents. You can browse the dashboard but bookings are paused.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm">
      <ShieldAlert className="mt-0.5 size-5 text-primary" />
      <div className="flex-1">
        <div className="font-medium">Finish verification to start accepting jobs</div>
        <p className="text-muted-foreground">Upload your ID, selfie, and a business document to go live.</p>
      </div>
      <Link to="/provider/setup" className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">Continue</Link>
    </div>
  );
}
