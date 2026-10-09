import { cn } from "@/lib/utils";

/** Original shipped Z mark, used without recoloring, cropping or distortion. */
export function ZwitsLogo({ wordmark = true, pulse = false, className }: { wordmark?: boolean; pulse?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-3", className)}>
      <span className="zwits-mark-surface inline-flex size-11 shrink-0 items-center justify-center rounded-xl">
        <img src="/icon-192.png" width={44} height={44} alt={wordmark ? "" : "Zwits"} data-pulse={pulse || undefined} className="zwits-mark size-11 shrink-0" decoding="async" />
      </span>
      {wordmark && <span className="font-display text-xl">ZWITS</span>}
    </span>
  );
}