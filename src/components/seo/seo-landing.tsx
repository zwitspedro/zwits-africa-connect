import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronRight, ShieldCheck } from "lucide-react";
import type { Crumb, Faq } from "@/lib/seo";
import { BUSINESS } from "@/lib/seo";

/**
 * One reusable SEO landing template shared by service, category, location,
 * delivery, business, provider and driver pages. Structure:
 * breadcrumb → H1 → intro → CTA → offer → how it works → benefits → trust →
 * FAQ → related → final CTA.
 */

export type CtaLink = { label: string; to: string };
export type Bullet = { title: string; text: string };
export type Step = { title: string; text: string };
export type RelatedLink = { label: string; to: string; text?: string };

export type SeoLandingProps = {
  crumbs: Crumb[];
  eyebrow?: string;
  h1: string;
  intro: string;
  primaryCta: CtaLink;
  secondaryCta?: CtaLink;
  offerTitle?: string;
  offer?: Bullet[];
  stepsTitle?: string;
  steps?: Step[];
  benefitsTitle?: string;
  benefits?: string[];
  areasTitle?: string;
  areas?: RelatedLink[];
  trust?: string;
  faqs?: Faq[];
  relatedTitle?: string;
  related?: RelatedLink[];
  finalCtaTitle?: string;
  finalCtaText?: string;
  children?: ReactNode;
};

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.path} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="text-foreground">{c.name}</span>
              ) : (
                <Link to={c.path} className="transition hover:text-foreground">{c.name}</Link>
              )}
              {!last && <ChevronRight className="size-3 opacity-60" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function SeoLanding(props: SeoLandingProps) {
  const {
    crumbs,
    eyebrow,
    h1,
    intro,
    primaryCta,
    secondaryCta,
    offerTitle = "What Zwits offers",
    offer,
    stepsTitle = "How it works",
    steps,
    benefitsTitle = "Why people choose Zwits",
    benefits,
    areasTitle = "Where we operate",
    areas,
    trust,
    faqs,
    relatedTitle = "Related pages",
    related,
    finalCtaTitle = "Ready when you are",
    finalCtaText,
    children,
  } = props;

  return (
    <>
      <section className="border-b border-border/60 bg-grain">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <Breadcrumbs crumbs={crumbs} />
          {eyebrow && (
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">{eyebrow}</p>
          )}
          <h1 className="mt-3 max-w-3xl font-display text-[2.1rem] font-bold leading-[1.08] tracking-tight sm:text-5xl">
            {h1}
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">{intro}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to={primaryCta.to}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {primaryCta.label} <ArrowRight className="size-4" />
            </Link>
            {secondaryCta && (
              <Link
                to={secondaryCta.to}
                className="inline-flex items-center rounded-full border border-border px-6 py-3 text-sm font-semibold transition hover:bg-muted"
              >
                {secondaryCta.label}
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        {offer && offer.length > 0 && (
          <section>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">{offerTitle}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {offer.map((o) => (
                <div key={o.title} className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-display text-base font-semibold">{o.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{o.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {children}

        {steps && steps.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">{stepsTitle}</h2>
            <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="rounded-2xl border border-border bg-card p-5">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Step {i + 1}</span>
                  <h3 className="mt-3 font-display text-base font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {benefits && benefits.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">{benefitsTitle}</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {benefits.map((b) => (
                <li key={b} className="flex gap-2.5 text-sm text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {areas && areas.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">{areasTitle}</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {areas.map((a) => (
                <Link
                  key={a.to + a.label}
                  to={a.to}
                  className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50"
                >
                  <span className="font-display text-base font-semibold group-hover:text-primary">{a.label}</span>
                  {a.text && <span className="mt-1.5 block text-sm text-muted-foreground">{a.text}</span>}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-14 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 className="font-display text-lg font-semibold">Who you're dealing with</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {trust ??
                  "Every provider and delivery partner on Zwits is identity-checked and reviewed before they can accept work, and every job is tracked inside the platform."}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {BUSINESS.legalName} · Registration {BUSINESS.registrationNumber} ·{" "}
                {BUSINESS.address.street}, {BUSINESS.address.suburb}, {BUSINESS.address.city}, {BUSINESS.address.country} ·{" "}
                <a href={`tel:${BUSINESS.phone}`} className="text-primary hover:underline">
                  {BUSINESS.phoneDisplay}
                </a>
              </p>
            </div>
          </div>
        </section>

        {faqs && faqs.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Frequently asked questions</h2>
            <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
              {faqs.map((f) => (
                <details key={f.q} className="group p-5">
                  <summary className="cursor-pointer list-none font-medium marker:hidden">
                    <span className="flex items-center justify-between gap-3">
                      {f.q}
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-90" aria-hidden="true" />
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {related && related.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">{relatedTitle}</h2>
            <ul className="mt-5 flex flex-wrap gap-2">
              {related.map((r) => (
                <li key={r.to + r.label}>
                  <Link
                    to={r.to}
                    className="inline-flex rounded-full border border-border px-4 py-2 text-sm transition hover:border-primary/60 hover:text-primary"
                  >
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-14 flex flex-col gap-4 rounded-3xl border border-gold/30 bg-card p-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">{finalCtaTitle}</h2>
            {finalCtaText && <p className="mt-1.5 text-sm text-muted-foreground">{finalCtaText}</p>}
          </div>
          <Link
            to={primaryCta.to}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {primaryCta.label} <ArrowRight className="size-4" />
          </Link>
        </section>
      </div>
    </>
  );
}
