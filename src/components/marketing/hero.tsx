import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Zap, Globe2 } from "lucide-react";

/**
 * Full-bleed hero: animated Harare skyline, moving riders and
 * live connection lines between customers, businesses and partners.
 */
export function Hero() {
  return (
    <section className="relative isolate flex min-h-[92vh] flex-col justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-20 aurora opacity-70" />
      <div className="pointer-events-none absolute inset-0 -z-10 grid-lines" />
      <Skyline />

      <div className="mx-auto w-full max-w-7xl px-5 pt-28 pb-40 sm:px-8 md:pt-36 md:pb-56">
        <div className="animate-rise inline-flex items-center gap-2.5 rounded-full glass px-4 py-1.5 text-[13px] text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          Zimbabwe&apos;s digital services ecosystem — live in 3 cities
        </div>

        <h1
          className="animate-rise mt-8 max-w-5xl text-balance-tight font-display text-[2.65rem] font-bold leading-[1.02] tracking-[-0.035em] sm:text-6xl md:text-7xl lg:text-[5.5rem]"
          style={{ animationDelay: "80ms" }}
        >
          One Platform.
          <br />
          Every Service.
          <br />
          <span className="text-gradient-fire animate-shimmer">Endless Possibilities.</span>
        </h1>

        <p
          className="animate-rise mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-xl"
          style={{ animationDelay: "160ms" }}
        >
          Zwits connects customers, businesses, delivery partners and skilled professionals
          through one trusted digital platform.
        </p>

        <div className="animate-rise mt-10 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "240ms" }}>
          <Link
            to="/services"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-[15px] font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            Book Now
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/become-a-provider"
            className="inline-flex items-center justify-center gap-2 rounded-full glass px-8 py-4 text-[15px] font-semibold text-foreground transition hover:bg-card"
          >
            Become a Partner
          </Link>
        </div>

        <div
          className="animate-rise mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 text-[13px] text-muted-foreground"
          style={{ animationDelay: "320ms" }}
        >
          <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-gold" /> Verified &amp; background-checked</span>
          <span className="inline-flex items-center gap-2"><Zap className="size-4 text-gold" /> Real-time dispatch &amp; tracking</span>
          <span className="inline-flex items-center gap-2"><Globe2 className="size-4 text-gold" /> Built for Africa, scaling continent-wide</span>
        </div>
      </div>
    </section>
  );
}

/** Layered SVG skyline with parallax bands, moving riders and connection arcs. */
function Skyline() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[62%] select-none">
      <svg
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMax slice"
        className="h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="zw-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="zw-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--foreground)" stopOpacity="0.10" />
            <stop offset="100%" stopColor="var(--foreground)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="zw-link" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--gold)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* connection arcs between people, businesses and partners */}
        <g fill="none" stroke="url(#zw-link)" strokeWidth="1.5" strokeLinecap="round">
          <path className="animate-dash" d="M120 250 Q 380 130 640 235" />
          <path className="animate-dash" style={{ animationDelay: "-0.5s" }} d="M640 235 Q 900 120 1180 220" />
          <path className="animate-dash" style={{ animationDelay: "-1s" }} d="M300 300 Q 700 210 1080 292" />
        </g>

        {/* node pulses = customers / businesses / providers */}
        {[
          [120, 250],
          [640, 235],
          [1180, 220],
          [300, 300],
          [1080, 292],
        ].map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="14" fill="var(--primary)" opacity="0.10" />
            <circle cx={cx} cy={cy} r="3.5" fill="var(--gold)" />
          </g>
        ))}

        {/* far skyline band */}
        <path
          fill="url(#zw-far)"
          d="M0 420 V300 h60 v-42 h44 v-38 h52 v58 h48 v-84 h40 v84 h58 v-52 h64 v52 h46 v-96 h42 v96 h52 v-44 h56 v44 h48 v-70 h44 v70 h60 v-56 h50 v56 h54 v-92 h40 v92 h58 v-48 h52 v48 h62 v-64 h48 v64 h72 V420 Z"
        />
        {/* near skyline band */}
        <path
          fill="url(#zw-near)"
          d="M0 420 V344 h78 v-40 h58 v40 h66 v-62 h54 v62 h72 v-30 h60 v30 h68 v-54 h56 v54 h64 v-36 h74 v36 h58 v-58 h62 v58 h70 v-28 h66 v28 h74 v-46 h60 v46 h80 V420 Z"
        />

        {/* road */}
        <line x1="0" y1="392" x2="1440" y2="392" stroke="var(--foreground)" strokeOpacity="0.10" strokeWidth="2" />
        <line
          x1="0"
          y1="392"
          x2="1440"
          y2="392"
          stroke="var(--gold)"
          strokeOpacity="0.35"
          strokeWidth="2"
          className="animate-dash"
        />
      </svg>

      {/* riders travelling the road */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute bottom-[6%] left-0 hidden h-2.5 w-2.5 rounded-full bg-primary shadow-glow sm:block"
          style={{
            animation: `rider-run ${16 + i * 5}s linear ${i * -6}s infinite`,
          }}
        />
      ))}

      <style>{`@keyframes rider-run { from { transform: translateX(-8vw); } to { transform: translateX(105vw); } }`}</style>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
