import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  Headphones,
  MapPin,
  Search,
  Star,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";
import { services } from "@/data/services";
import { fulfilmentModeFor } from "@/lib/dispatch-config";

export const Route = createFileRoute("/services/$slug")({
  loader: ({ params }) => {
    const service = services.find((s) => s.slug === params.slug);
    if (!service) throw notFound();
    return { name: service.name, tagline: service.tagline, description: service.description };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Service unavailable — Zwits" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — Book Verified Pros | Zwits`;
    return {
      meta: [
        { title },
        { name: "description", content: `${loaderData.description} See pricing, browse verified ${loaderData.name.toLowerCase()} providers and book in minutes on Zwits.` },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.tagline },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:url", content: `https://zwits-africa-connect.lovable.app/services/${params.slug}` },
      ],
      links: [{ rel: "canonical", href: `https://zwits-africa-connect.lovable.app/services/${params.slug}` }],
    };
  },
  notFoundComponent: ServiceNotFound,
  component: ServiceDetail,
});

function ServiceNotFound() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">We don't offer that service yet</h1>
        <Link to="/services" className="mt-4 inline-block text-primary underline">Browse all services</Link>
      </div>
    </SiteShell>
  );
}

function ServiceDetail() {
  const { slug } = Route.useParams();
  const service = services.find((s) => s.slug === slug)!;
  const Icon = service.icon;
  const mode = fulfilmentModeFor(slug);
  const related = services.filter((s) => s.slug !== slug).slice(0, 4);

  const { data: providers, isLoading } = useQuery({
    queryKey: ["service-providers", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id, business_name, city, hourly_rate, rating_avg, ratings_count, jobs_completed, verified, available, bio")
        .eq("category", slug)
        .eq("verification_status", "approved")
        .order("rating_avg", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  const rates = (providers ?? []).map((p) => Number(p.hourly_rate)).filter((n) => n > 0);
  const low = rates.length ? Math.min(...rates) : null;
  const high = rates.length ? Math.max(...rates) : null;
  const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;

  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60 bg-grain">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <Link to="/services" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> All services
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="grid size-16 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Icon className="size-8" />
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">{service.name}</h1>
              <p className="mt-1 text-gold">{service.tagline}</p>
            </div>
          </div>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{service.description}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/book/$category"
              params={{ category: slug }}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Book {service.name} <ArrowUpRight className="size-4" />
            </Link>
            <a href="#providers" className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:border-primary/50">
              Verified providers
            </a>
            <a href="#pricing" className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:border-primary/50">
              Pricing
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-1.5">
            {service.examples.map((e) => (
              <span key={e} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{e}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / quotation */}
      <section id="pricing" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14 sm:px-6">
        <h2 className="font-display text-2xl font-semibold">Pricing & quotes</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Typical rate</p>
            <p className="mt-2 font-display text-3xl font-bold">
              {avg ? `$${avg.toFixed(0)}` : `$${service.estimate.from}–${service.estimate.to}`}
              <span className="text-base font-normal text-muted-foreground">
                /{avg ? "hr" : service.estimate.unit}
              </span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {low != null && high != null
                ? `Range $${low.toFixed(0)} – $${high.toFixed(0)}`
                : "Indicative guide — you get a firm price before you confirm"}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">How you're matched</p>
            <p className="mt-2 font-display text-xl font-semibold">
              {mode === "quotes" ? "Compare quotes" : "Instant dispatch"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "quotes"
                ? "Providers send you priced offers — pick the one you like."
                : "The nearest available pro is assigned automatically."}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Availability</p>
            <p className="mt-2 flex items-center gap-2 font-display text-xl font-semibold">
              <CalendarClock className="size-5 text-primary" />
              {service.scheduling.allowAsap ? "ASAP or scheduled" : "Scheduled only"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {String(service.scheduling.hoursStart).padStart(2, "0")}:00 – {String(service.scheduling.hoursEnd).padStart(2, "0")}:00,
              up to {service.scheduling.maxDaysAhead} days ahead.
            </p>
          </div>
        </div>
        <Link
          to="/book/$category"
          params={{ category: slug }}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/50 px-5 py-2.5 text-sm font-medium text-primary hover:bg-primary/10"
        >
          Request a quote for {service.name} <ArrowUpRight className="size-4" />
        </Link>
      </section>

      {/* Providers */}
      <section id="providers" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">Verified {service.name.toLowerCase()} providers</h2>
          <span className="text-sm text-muted-foreground">{providers?.length ?? 0} listed</span>
        </div>

        {isLoading && <p className="mt-5 text-sm text-muted-foreground">Loading providers…</p>}

        {!isLoading && (providers?.length ?? 0) === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No providers listed here yet — book anyway and we'll match you as soon as one goes live.
            </p>
            <Link
              to="/book/$category"
              params={{ category: slug }}
              className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Book {service.name}
            </Link>
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(providers ?? []).map((p) => (
            <div key={p.id} className="flex flex-col rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <span className="font-medium">{p.business_name}</span>
                {p.verified && <BadgeCheck className="size-4 text-gold" />}
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${p.available ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                  {p.available ? "Available" : "Busy"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5"><Star className="size-3 fill-gold text-gold" /> {Number(p.rating_avg).toFixed(1)} ({p.ratings_count})</span>
                <span className="flex items-center gap-0.5">· <MapPin className="size-3" /> {p.city}</span>
                <span>· ${p.hourly_rate}/hr</span>
              </div>
              {p.bio && <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">{p.bio}</p>}
              <Link
                to="/book/$category"
                params={{ category: slug }}
                search={{ provider: p.id }}
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Book this pro <ArrowUpRight className="size-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Interconnected navigation */}
      <section className="border-t border-border/60 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-semibold">Related services</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((s) => {
              const RIcon = s.icon;
              return (
                <Link
                  key={s.slug}
                  to="/services/$slug"
                  params={{ slug: s.slug }}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/50"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                    <RIcon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{s.name}</span>
                    <span className="block text-xs text-muted-foreground">{s.tagline}</span>
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <Link to="/services" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 hover:border-primary/50">
              <ArrowLeft className="size-4" /> Back to all services
            </Link>
            <Link to="/services" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 hover:border-primary/50">
              <Search className="size-4" /> Search services
            </Link>
            <Link to="/book/$category" params={{ category: slug }} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 hover:border-primary/50">
              Request a quote
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 hover:border-primary/50">
              <Headphones className="size-4" /> Customer support
            </Link>
            <Link to="/pricing" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 hover:border-primary/50">
              Pricing overview
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
