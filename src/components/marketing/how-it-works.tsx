import { Reveal } from "./reveal";

const steps = [
  { n: "01", title: "Customer books", text: "Pick a service, set the address and time, confirm the price." },
  { n: "02", title: "Provider accepts", text: "The nearest verified partner is matched and confirms in seconds." },
  { n: "03", title: "Live tracking", text: "Follow arrival on the map, chat or call, share photos in-app." },
  { n: "04", title: "Completion", text: "Proof of delivery or job completion is captured and stored." },
  { n: "05", title: "Rating & payout", text: "You rate the job; the partner is paid out with commission reconciled." },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 md:py-32">
      <Reveal>
        <p className="text-[12px] uppercase tracking-[0.22em] text-gold">How it works</p>
        <h2 className="mt-4 max-w-3xl text-balance-tight font-display text-4xl font-bold tracking-[-0.03em] md:text-6xl">
          Tap to done, in five moves.
        </h2>
      </Reveal>

      <ol className="relative mt-16 grid gap-10 md:grid-cols-5 md:gap-6">
        {steps.map((s, i) => (
          <li key={s.n} className="relative">
            <Reveal delay={i * 90}>
              <span className="mb-6 grid size-8 place-items-center rounded-full border border-primary/40 bg-background text-xs font-bold text-primary-text">{s.n}</span>
              <h3 className="font-sans text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
