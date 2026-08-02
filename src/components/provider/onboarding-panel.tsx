import { ArrowRight, Check, ChevronRight, PartyPopper } from "lucide-react";
import type { SectionKey } from "./dashboard-nav";
import type { ProviderStep, ProviderStepKey } from "./use-provider-onboarding";

export function OnboardingPanel({
  steps,
  completed,
  total,
  next,
  onGo,
}: {
  steps: ProviderStep[];
  completed: number;
  total: number;
  next: ProviderStep | null;
  onGo: (section: SectionKey, key: ProviderStepKey) => void;
}) {
  const allDone = completed === total;

  return (
    <section className="rounded-3xl border border-border/70 bg-card/70 p-5 shadow-sm">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold">Getting started</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {allDone ? "Your account is fully set up." : "Complete these steps to start receiving jobs"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold tabular-nums text-primary">
          {completed}/{total} completed
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(completed / total) * 100}%` }} />
      </div>

      {allDone ? (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-500/10 p-4 text-sm font-medium text-emerald-600">
          <PartyPopper className="size-5 shrink-0" /> You&apos;re ready to receive jobs!
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {steps.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => onGo(s.section, s.key)}
                className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                  s.done ? "border-emerald-500/40 bg-emerald-500/8" : "border-border/70 bg-background/60"
                }`}
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-full ${
                    s.done ? "bg-emerald-500 text-white" : "border-2 border-primary/40 text-primary"
                  }`}
                >
                  {s.done ? <Check className="size-5" /> : <span className="size-2.5 rounded-full bg-primary" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold">{s.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{s.hint}</span>
                </span>
                {!s.done && <ChevronRight className="size-5 shrink-0 text-muted-foreground" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!allDone && next && (
        <button
          type="button"
          onClick={() => onGo(next.section, next.key)}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground transition active:scale-[0.99]"
        >
          Continue setup <ArrowRight className="size-4" />
        </button>
      )}
    </section>
  );
}
