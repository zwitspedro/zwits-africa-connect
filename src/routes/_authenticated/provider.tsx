import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, BadgeCheck, MapPin } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProviderTracking } from "@/hooks/use-provider-tracking";

export const Route = createFileRoute("/_authenticated/provider")({
  head: () => ({ meta: [{ title: "Provider dashboard — Zwits" }] }),
  component: ProviderDashboard,
});

function ProviderDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

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

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled" }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
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
  const earnings = completed.reduce((s, j) => s + (Number(j.price) || 0), 0);

  return (
    <SiteShell>
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
            {profile.available ? "Available" : "Offline"}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Active jobs" value={active.length} />
          <Stat label="Completed" value={profile.jobs_completed} />
          <Stat label="Rating" value={`${Number(profile.rating_avg).toFixed(1)} ★`} />
          <Stat label="Earnings" value={`$${earnings.toFixed(0)}`} />
        </div>

        <h2 className="mt-10 font-display text-xl font-semibold">Active jobs</h2>
        <ul className="mt-3 grid gap-3">
          {active.length === 0 && <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No active jobs.</li>}
          {active.map((j) => (
            <li key={j.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-primary">{j.category} · {j.status}</div>
                  <div className="mt-1 font-medium">{j.address}</div>
                  {j.description && <div className="mt-1 text-sm text-muted-foreground">{j.description}</div>}
                </div>
                <div className="flex flex-col gap-2">
                  {j.status === "pending" && (
                    <button onClick={() => updateStatus.mutate({ id: j.id, status: "accepted" })} className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground">Accept</button>
                  )}
                  {j.status === "accepted" && (
                    <button onClick={() => updateStatus.mutate({ id: j.id, status: "in_progress" })} className="rounded-full bg-gold px-3 py-1.5 text-xs text-background">Start</button>
                  )}
                  {j.status === "in_progress" && (
                    <button onClick={() => updateStatus.mutate({ id: j.id, status: "completed" })} className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs text-background">Complete</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 font-display text-xl font-semibold">History</h2>
        <ul className="mt-3 grid gap-2">
          {completed.slice(0, 10).map((j) => (
            <li key={j.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm">
              <span>{j.category} — {j.address}</span>
              <span className="text-xs text-muted-foreground">{new Date(j.updated_at).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </SiteShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
