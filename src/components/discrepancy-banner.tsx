import { AlertTriangle, CheckCircle2 } from "lucide-react";

export type DiscrepancyIssue = {
  kind:
    | "missing_rate"
    | "min_fee_cap"
    | "zero_price"
    | "unpaid"
    | "rate_inactive"
    | "net_mismatch";
  label: string;
  detail?: string;
  amount?: number;
};

type Props = {
  /** Drilldown's recomputed net using current active rates */
  computedNet: number;
  /** "Stored" net the provider/system would otherwise see (e.g. gross-based or last-known) */
  storedNet: number;
  issues: DiscrepancyIssue[];
  className?: string;
};

const KIND_LABEL: Record<DiscrepancyIssue["kind"], string> = {
  missing_rate: "Missing rate",
  rate_inactive: "Inactive rate",
  min_fee_cap: "Min-fee cap",
  zero_price: "Zero price",
  unpaid: "Unpaid",
  net_mismatch: "Net mismatch",
};

export function DiscrepancyBanner({ computedNet, storedNet, issues, className = "" }: Props) {
  const delta = computedNet - storedNet;
  const tolerance = 0.01;
  const hasDelta = Math.abs(delta) > tolerance;
  const hasIssues = issues.length > 0;
  const isClean = !hasDelta && !hasIssues;

  if (isClean) {
    return (
      <div
        className={`flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 ${className}`}
      >
        <CheckCircle2 className="size-4 shrink-0" />
        <span>Reconciled — drilldown net matches stored payout total.</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-100 ${className}`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-amber-200">
            Payout discrepancy detected
          </div>
          {hasDelta && (
            <div className="mt-1 text-xs text-amber-200/90">
              Drilldown net{" "}
              <span className="font-mono">${computedNet.toFixed(2)}</span> vs stored payout{" "}
              <span className="font-mono">${storedNet.toFixed(2)}</span> — difference{" "}
              <span className={`font-mono font-semibold ${delta < 0 ? "text-red-300" : "text-emerald-300"}`}>
                {delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(2)}
              </span>
              .
            </div>
          )}
          {hasIssues && (
            <ul className="mt-2 space-y-1 text-xs text-amber-100/90">
              {issues.map((i, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-200">
                    {KIND_LABEL[i.kind]}
                  </span>
                  <span className="flex-1">
                    {i.label}
                    {i.detail && <span className="text-amber-100/70"> · {i.detail}</span>}
                  </span>
                  {typeof i.amount === "number" && (
                    <span className="font-mono text-amber-200">${i.amount.toFixed(2)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
