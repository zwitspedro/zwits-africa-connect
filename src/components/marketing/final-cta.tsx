import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./reveal";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-28 sm:px-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] border border-gold/25 p-10 text-center md:p-20">
          <div className="pointer-events-none absolute inset-0 aurora opacity-60" />
          <div className="pointer-events-none absolute inset-0 grid-lines opacity-60" />
          <div className="relative mx-auto max-w-3xl">
            <h2 className="text-balance-tight font-display text-4xl font-bold tracking-[-0.03em] md:text-6xl">
              Join the ecosystem building everyday Africa.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-muted-foreground md:text-lg">
              Book a service, list your business or start earning as a partner — it takes minutes.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-[15px] font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
              >
                Get started <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/become-a-provider"
                className="inline-flex items-center justify-center rounded-full glass-strong px-8 py-4 text-[15px] font-semibold"
              >
                Become a partner
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
