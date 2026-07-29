import { Star } from "lucide-react";
import { Reveal } from "./reveal";

const testimonials = [
  {
    quote:
      "We moved our entire pharmacy last-mile onto Zwits. Same-day delivery went from a promise to a process — and the monthly invoicing keeps finance happy.",
    name: "Rutendo Chikoore",
    role: "Operations Director, Medex Pharmacies",
  },
  {
    quote:
      "Booking a plumber used to take three phone calls and a whole morning. Now it takes ninety seconds and I can see exactly when he'll arrive.",
    name: "Farai & Nomsa Moyo",
    role: "Family customers, Harare",
  },
  {
    quote:
      "Their API dropped into our order system in a week. Tracking events flow straight to our customers — that's rare for this market.",
    name: "Kudzai Nyathi",
    role: "CTO, Savanna Retail Group",
  },
  {
    quote:
      "I've done over 800 jobs on Zwits. The payouts land on time, every time, and my rating brings me repeat clients.",
    name: "Tatenda Mhaka",
    role: "Delivery partner, Bulawayo",
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 md:py-32">
      <Reveal>
        <p className="text-[12px] uppercase tracking-[0.22em] text-gold">Trusted by</p>
        <h2 className="mt-4 max-w-3xl text-balance-tight font-display text-4xl font-bold tracking-[-0.03em] md:text-6xl">
          Families, founders and enterprises.
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-4 md:grid-cols-2">
        {testimonials.map((t, i) => (
          <Reveal key={t.name} delay={i * 70}>
            <figure className="flex h-full flex-col rounded-3xl glass p-8 hover-lift hover:border-primary/40">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="size-3.5 fill-gold text-gold" />
                ))}
              </div>
              <blockquote className="mt-6 flex-1 text-[15px] leading-relaxed text-foreground/90">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-7 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary/15 font-display text-sm font-bold text-primary">
                  {t.name.charAt(0)}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{t.name}</span>
                  <span className="block text-xs text-muted-foreground">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
