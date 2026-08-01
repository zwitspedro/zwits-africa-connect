import { ArrowRight, Check, ChevronRight, Lock, PartyPopper } from "lucide-react";
import type { OnboardingStep, OnboardingStepKey } from "./use-driver-onboarding";

export function OnboardingChecklist({
  steps,
  completed,
  total,
  next,
  onGo,
}: {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  next: OnboardingStepKey | null;
  onGo: (k: OnboardingStepKey) => void;
}) {
  const allDone = completed === total;

  return (
    <section className="rounded-3xl border border-border/70 bg-card/70 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold">Getting started</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {allDone ? "You're ready to receive jobs." : "Complete these steps to start receiving jobs"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold tabular-nums text-primary">
          {completed}/{total} completed
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(completed / total) * 100}%` }}
        />
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
                disabled={s.locked}
                onClick={() => onGo(s.key)}
                className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-4 text-left transition active:scale-[0.99] disabled:opacity-55 ${
                  s.done ? "border-emerald-500/40 bg-emerald-500/8" : "border-border/70 bg-background/60"
                }`}
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-full ${
                    s.done
                      ? "bg-emerald-500 text-white"
                      : s.locked
                        ? "bg-muted text-muted-foreground"
                        : "border-2 border-primary/40 text-primary"
                  }`}
                >
                  {s.done ? <Check className="size-5" /> : s.locked ? <Lock className="size-4" /> : <span className="size-2.5 rounded-full bg-primary" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold">{s.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {s.locked ? "Locked until the steps above are done" : s.hint}
                  </span>
                </span>
                {!s.done && !s.locked && <ChevronRight className="size-5 shrink-0 text-muted-foreground" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => onGo(next ?? "online")}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground transition active:scale-[0.99]"
      >
        {allDone ? "Go to dashboard" : "Continue setup"} <ArrowRight className="size-4" />
      </button>
    </section>
  );
}

export function ReadyBanner({ online, onToggle, busy }: { online: boolean; onToggle: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-3xl border p-5 text-left transition active:scale-[0.99] disabled:opacity-60 ${
        online ? "border-emerald-500/40 bg-emerald-500/10" : "border-border/70 bg-card/70"
      }`}
    >
      <span className={`size-4 shrink-0 rounded-full ${online ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
      <span className="min-w-0">
        <span className="block font-display text-xl font-bold">{online ? "You're online" : "You're offline"}</span>
        <span className="block text-sm text-muted-foreground">
          {online ? "You're ready to receive jobs." : "Go online when you're ready to receive jobs."}
        </span>
      </span>
      <span className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${online ? "bg-emerald-500" : "bg-muted"}`}>
        <span
          className={`absolute top-1 size-6 rounded-full bg-background shadow transition-all duration-300 ${online ? "left-7" : "left-1"}`}
        />
      </span>
    </button>
  );
}
