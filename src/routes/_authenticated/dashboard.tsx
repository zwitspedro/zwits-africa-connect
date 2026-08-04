import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/hooks/use-auth";
import { useIsProvider } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import { services } from "@/data/services";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Zwits" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const isProvider = useIsProvider();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count: pending } = await supabase
        .from("bookings").select("*", { count: "exact", head: true })
        .eq("customer_id", user!.id).in("status", ["pending", "accepted", "in_progress"]);
      const { count: done } = await supabase
        .from("bookings").select("*", { count: "exact", head: true })
        .eq("customer_id", user!.id).eq("status", "completed");
      return { pending: pending ?? 0, done: done ?? 0 };
    },
  });

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold">Hi {user?.email ?? user?.phone} 👋</h1>
        <p className="mt-2 text-sm text-muted-foreground">What do you need today?</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Active" value={stats?.pending ?? 0} />
          <Stat label="Completed" value={stats?.done ?? 0} />
          <Stat label="Saved" value="—" />
          <Stat label="Wallet" value="$0" />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/bookings" className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">My bookings</Link>
          {isProvider ? (
            <Link to="/provider" className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-background hover:opacity-90">Provider dashboard</Link>
          ) : (
            <Link to="/provider/setup" className="rounded-full border border-gold/40 px-4 py-2 text-sm text-gold hover:bg-gold/10">Become a provider</Link>
          )}
        </div>

        <h2 className="mt-10 font-display text-xl font-semibold">Book a service</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {services.map((s) => (
            <Link
              key={s.slug}
              to="/book/$category"
              params={{ category: s.slug }}
              search={{ provider: undefined }}
              className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary"
            >
              <s.icon className="size-6 text-primary" />
              <div className="mt-3 text-sm font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground">{s.tagline}</div>
            </Link>
          ))}
        </div>
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
