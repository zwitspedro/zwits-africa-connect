import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, MapPin, Star, Wallet, Clock, Smartphone } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { services } from "@/data/services";
import heroRider from "@/assets/hero-rider.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zwits — Book trusted services across Africa" },
      { name: "description", content: "Zwits connects you with trusted providers for deliveries, transport, repairs, cleaning, farming, beauty, freelance and emergency help." },
      { property: "og:title", content: "Zwits — Book trusted services across Africa" },
      { property: "og:description", content: "Zwits connects you with trusted providers for deliveries, transport, repairs, cleaning, farming, beauty, freelance and emergency help." },
      { property: "og:url", content: "https://zwits-africa-connect.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://zwits-africa-connect.lovable.app/" }],
  }),
  component: Home,
});

function Home() {
  return (
    <SiteShell>
      <Hero />
      <Stats />
      <ServicesGrid />
      <HowItWorks />
      <Providers />
      <CTA />
    </SiteShell>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grain opacity-80" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pt-16 pb-20 sm:px-6 md:grid-cols-2 md:gap-12 md:pt-24 md:pb-28">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            Now live in Harare · Bulawayo · Mutare
          </span>
          <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Everyday services. <br />
            <span className="text-gradient-fire">Done the Zwits way.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
            Book a rider, a cleaner, a mechanic or a tutor in a few taps. Track them live. Pay with EcoCash, InnBucks or your card.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-glow transition hover:opacity-90">
              Book a service <ArrowRight className="size-4" />
            </Link>
            <Link to="/become-a-provider" className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/40 px-6 py-3 font-medium text-gold transition hover:bg-gold/10">
              Earn as a provider
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-gold" /> Verified providers</span>
            <span className="inline-flex items-center gap-2"><MapPin className="size-4 text-gold" /> Live GPS tracking</span>
            <span className="inline-flex items-center gap-2"><Wallet className="size-4 text-gold" /> EcoCash · InnBucks · Visa</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-primary/20 via-transparent to-gold/20 blur-2xl" />
          <div className="relative overflow-hidden rounded-3xl border border-border ring-gold">
            <img
              src={heroRider}
              alt="Zwits delivery rider on a Harare street at sunset"
              width={1536}
              height={1024}
              className="h-full w-full object-cover"
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3 backdrop-blur-xl">
              <div>
                <p className="text-xs text-muted-foreground">Arriving in</p>
                <p className="font-display text-xl font-bold">7 min</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Tatenda M.</p>
                <p className="inline-flex items-center gap-1 text-sm"><Star className="size-3.5 fill-gold text-gold" /> 4.96</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const items = [
    ["12k+", "Active customers"],
    ["1,400+", "Verified providers"],
    ["98%", "Jobs completed"],
    ["3 cities", "And growing"],
  ];
  return (
    <section className="border-y border-border/60 bg-card/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        {items.map(([v, l]) => (
          <div key={l} className="text-center md:text-left">
            <p className="font-display text-3xl font-bold text-foreground md:text-4xl">{v}</p>
            <p className="mt-1 text-sm text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServicesGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-gold">What we do</p>
          <h2 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">Eight ways to get it done</h2>
        </div>
        <Link to="/services" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">All services →</Link>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.slug}
              to="/services"
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition hover:border-primary/60 hover:bg-card/80"
            >
              <div className="grid size-12 place-items-center rounded-xl bg-primary/15 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-6" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{s.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {s.examples.slice(0, 3).map((e) => (
                  <span key={e} className="rounded-full border border-border bg-background/40 px-2 py-0.5 text-[11px] text-muted-foreground">{e}</span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Smartphone, title: "Open Zwits", text: "Pick a service and tell us what you need." },
    { icon: MapPin, title: "We match you", text: "A verified provider near you accepts the job." },
    { icon: Clock, title: "Track live", text: "Follow them on the map until the job is done." },
    { icon: Star, title: "Pay & rate", text: "Pay in-app and leave a rating to keep quality high." },
  ];
  return (
    <section className="bg-card/40 border-y border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <p className="text-sm font-medium text-gold">How it works</p>
        <h2 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">From tap to done in minutes</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="relative rounded-2xl border border-border bg-background p-6">
                <span className="absolute right-5 top-5 font-display text-3xl font-bold text-muted/60">0{i + 1}</span>
                <Icon className="size-6 text-primary" />
                <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Providers() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-gold">For providers</p>
          <h2 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">Turn your skill into steady income</h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            Whether you ride a motorbike, fix taps, braid hair or run a tractor — Zwits brings jobs to your phone. Keep most of what you earn; Zwits takes a small commission per job.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {["Flexible hours — switch availability on or off", "Direct payouts to your mobile wallet", "Ratings build your reputation"].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-1 size-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">{t}</span>
              </li>
            ))}
          </ul>
          <Link to="/become-a-provider" className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 font-medium text-gold-foreground transition hover:opacity-90">
            Apply to join <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="rounded-2xl border border-border bg-background p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">This week</p>
                <p className="font-display text-3xl font-bold">US$ 184.50</p>
              </div>
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs text-primary">+22%</span>
            </div>
            <div className="mt-5 grid grid-cols-7 items-end gap-2 h-28">
              {[40, 55, 30, 70, 90, 60, 80].map((h, i) => (
                <div key={i} className="rounded-md bg-gradient-to-t from-primary/30 to-primary" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
            <Stat label="Jobs" value="28" />
            <Stat label="Rating" value="4.9" />
            <Stat label="Acceptance" value="97%" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="font-display text-xl font-bold text-foreground">{value}</p>
      <p>{label}</p>
    </div>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-primary/20 via-background to-gold/20 p-10 md:p-14">
        <div className="relative max-w-2xl">
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Ready when you are.</h2>
          <p className="mt-3 text-muted-foreground">Download Zwits and get your first job done today.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">
              Get the app
            </Link>
            <Link to="/contact" className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 font-medium text-foreground">
              Talk to sales
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
