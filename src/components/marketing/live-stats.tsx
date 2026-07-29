import { Reveal, useCountUp } from "./reveal";

type Metric = { label: string; value: number; suffix?: string; prefix?: string; decimals?: number };

const metrics: Metric[] = [
  { label: "Deliveries completed", value: 128000, suffix: "+" },
  { label: "Businesses served", value: 2400, suffix: "+" },
  { label: "Service providers", value: 1400, suffix: "+" },
  { label: "Cities covered", value: 3 },
  { label: "Customer satisfaction", value: 98.4, suffix: "%", decimals: 1 },
];

function format(v: number, m: Metric) {
  if (m.decimals) return v.toFixed(m.decimals);
  if (v >= 1000) return Math.round(v).toLocaleString("en-US");
  return String(Math.round(v));
}

function Counter({ metric }: { metric: Metric }) {
  const { ref, value } = useCountUp(metric.value);
  return (
    <div className="px-2 py-6 text-center md:px-6">
      <p className="font-display text-3xl font-bold tracking-tight tabular-nums md:text-[2.6rem]">
        <span ref={ref}>{format(value, metric)}</span>
        {metric.suffix}
      </p>
      <p className="mt-2 text-[13px] text-muted-foreground">{metric.label}</p>
    </div>
  );
}

export function LiveStats() {
  return (
    <section className="relative border-y border-border/60 surface-elevated">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <div className="flex items-center justify-center gap-2 pt-10 text-[12px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            Platform activity
          </div>
          <div className="grid grid-cols-2 divide-border/50 pb-6 md:grid-cols-5 md:divide-x">
            {metrics.map((m) => (
              <Counter key={m.label} metric={m} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
