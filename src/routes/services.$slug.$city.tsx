import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { SeoLanding } from "@/components/seo/seo-landing";
import { supabase } from "@/integrations/supabase/client";
import { services } from "@/data/services";
import { findLiveCity, HARARE_SUBURBS } from "@/data/locations";
import {
  seo,
  breadcrumbJsonLd,
  faqJsonLd,
  serviceJsonLd,
  type Crumb,
} from "@/lib/seo";

export const Route = createFileRoute("/services/$slug/$city")({
  loader: ({ params }) => {
    const service = services.find((s) => s.slug === params.slug);
    const city = findLiveCity(params.city);
    if (!service || !city) throw notFound();
    return {
      name: service.name,
      description: service.description,
      cityName: city.name,
    };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Page unavailable — Zwits" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { name, description, cityName } = loaderData;
    const path = `/services/${params.slug}/${params.city}`;
    const title = `${name} in ${cityName} | Book Verified Providers | Zwits`;
    const metaDescription = `Find ${name.toLowerCase()} providers in ${cityName}. ${description} Book a verified Zwits professional and see the price before you confirm.`;
    return seo({
      title,
      description: metaDescription,
      path,
      jsonLd: [
        breadcrumbJsonLd(crumbsFor(name, cityName, params.slug, path)),
        serviceJsonLd({ name: `${name} in ${cityName}`, description: metaDescription, path, areaServed: cityName }),
        faqJsonLd(faqsFor(name, cityName)),
      ],
    });
  },
  notFoundComponent: CityNotFound,
  component: ServiceCityPage,
});

function crumbsFor(name: string, cityName: string, slug: string, path: string): Crumb[] {
  return [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name, path: `/services/${slug}` },
    { name: cityName, path },
  ];
}

function faqsFor(name: string, cityName: string) {
  const lower = name.toLowerCase();
  return [
    {
      q: `How do I book ${lower} in ${cityName}?`,
      a: `Choose the service, tell Zwits where and when you need it, and the request goes to verified ${lower} providers working in ${cityName}. You confirm once you are happy with the price.`,
    },
    {
      q: `What does ${lower} cost in ${cityName}?`,
      a: "Rates vary by the size of the job and the provider. Zwits shows an indicative guide up front and a firm price before you confirm the booking.",
    },
    {
      q: `Are the providers verified?`,
      a: "Yes. Providers must pass identity verification and profile review before they can accept work on Zwits, and ratings come only from completed jobs.",
    },
  ];
}

function CityNotFound() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">Not available in that area yet</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Zwits services are currently live in Harare. More cities are coming.
        </p>
        <Link to="/services" className="mt-5 inline-block text-primary underline">
          Browse all services
        </Link>
      </div>
    </SiteShell>
  );
}

function ServiceCityPage() {
  const { slug, city } = Route.useParams();
  const { cityName } = Route.useLoaderData();
  const service = services.find((s) => s.slug === slug)!;
  const path = `/services/${slug}/${city}`;
  const lower = service.name.toLowerCase();

  const { data: providers } = useQuery({
    queryKey: ["service-city-providers", slug, city],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id, business_name, city, hourly_rate, rating_avg, ratings_count, verified, available, bio")
        .eq("category", slug)
        .eq("verification_status", "approved")
        .ilike("city", cityName)
        .order("rating_avg", { ascending: false })
        .limit(9);
      if (error) throw error;
      return data;
    },
  });

  const related = services.filter((s) => s.slug !== slug).slice(0, 6);

  return (
    <SiteShell>
      <SeoLanding
        crumbs={crumbsFor(service.name, cityName, slug, path)}
        eyebrow={`${cityName} · ${service.name}`}
        h1={`Find ${lower} services in ${cityName}`}
        intro={`${service.description} Zwits matches your request to verified ${lower} providers working in ${cityName}, with the price agreed before any work starts.`}
        primaryCta={{ label: `Book ${lower} in ${cityName}`, to: "/book" }}
        secondaryCta={{ label: `All ${lower} providers`, to: `/services/${slug}` }}
        offerTitle={`What ${lower} on Zwits covers`}
        offer={service.examples.map((e) => ({
          title: e,
          text: `${e} handled by a verified ${lower} provider in ${cityName}.`,
        }))}
        steps={[
          { title: "Describe the job", text: `Tell Zwits what you need done and where in ${cityName} you are.` },
          { title: "Get matched", text: `Nearby verified ${lower} providers receive the request and respond.` },
          { title: "Book and pay", text: "Confirm the price, get the job done and pay through Zwits or in cash." },
        ]}
        benefits={[
          `Providers who actually work in ${cityName}, not a national call list.`,
          "Identity-checked professionals reviewed before their first job.",
          "Indicative pricing up front and a firm price before you confirm.",
          "Ratings from real completed jobs only.",
        ]}
        areasTitle={cityName === "Harare" ? "Areas we cover in Harare" : "Coverage"}
        areas={
          cityName === "Harare"
            ? HARARE_SUBURBS.map((s) => ({ label: s.name, to: `/delivery/harare/${s.slug}` }))
            : undefined
        }
        faqs={faqsFor(service.name, cityName)}
        relatedTitle="Related services"
        related={[
          ...related.map((s) => ({ label: s.name, to: `/services/${s.slug}` })),
          { label: "Join Zwits as a provider", to: "/providers" },
        ]}
        finalCtaTitle={`Need ${lower} in ${cityName}?`}
        finalCtaText="Post the job and get matched to an available provider."
      >
        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Verified {lower} providers in {cityName}
          </h2>
          {(providers?.length ?? 0) === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No {lower} provider is listed publicly for {cityName} right now. Book anyway and Zwits
              will match you as soon as one goes online.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(providers ?? []).map((p) => (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.business_name}</span>
                    {p.verified && <BadgeCheck className="size-4 text-gold" aria-label="Verified" />}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Star className="size-3 fill-gold text-gold" /> {Number(p.rating_avg).toFixed(1)} ({p.ratings_count})
                    </span>
                    <span className="flex items-center gap-0.5">
                      · <MapPin className="size-3" /> {p.city}
                    </span>
                  </div>
                  {p.bio && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{p.bio}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </SeoLanding>
    </SiteShell>
  );
}
