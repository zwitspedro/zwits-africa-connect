import { Link } from "@tanstack/react-router";
import { Building2, Boxes, FileText, PlugZap, ArrowRight } from "lucide-react";
import { Reveal } from "./reveal";

const features = [
  { icon: Boxes, title: "Same-day delivery requests", text: "Send parcels across Harare with live driver tracking." },
  { icon: FileText, title: "Monthly accounts & invoicing", text: "Coming soon — consolidated statements for business accounts." },
  { icon: PlugZap, title: "API integrations", text: "Coming soon — create jobs straight from your systems." },
  { icon: Building2, title: "Talk to our team", text: "Tell us your volumes and we will set up your account." },
];

export function BusinessSolutions() {
  return (
    <section className="relative border-y border-border/60 surface-elevated">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-8 md:grid-cols-2 md:items-center md:py-32">
        <Reveal>
          <p className="text-[12px] uppercase tracking-[0.22em] text-gold">Zwits Business</p>
          <h2 className="mt-4 text-balance-tight font-display text-4xl font-bold tracking-[-0.03em] md:text-5xl">
            Enterprise operations, without the overhead.
          </h2>
          <p className="mt-5 max-w-lg text-muted-foreground md:text-lg">
            Retailers, pharmacies, restaurants and corporates run their last mile and facilities
            work on Zwits.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/business" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
              Explore Business Portal <ArrowRight className="size-4" />
            </Link>
            <Link to="/contact" className="inline-flex items-center justify-center rounded-full glass px-7 py-3.5 text-sm font-semibold">
              Talk to sales
            </Link>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl glass p-6 hover-lift hover:border-primary/40">
                <f.icon className="size-5 text-gold" />
                <h3 className="mt-5 font-display text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
