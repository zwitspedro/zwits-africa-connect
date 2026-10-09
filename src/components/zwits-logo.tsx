import { cn } from "@/lib/utils";

/** Original shipped Z mark, used without recoloring, cropping or distortion. */
export function ZwitsLogo({ wordmark = true, className }: { wordmark?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-3", className)}>
      <img src="/icon-192.png" width={44} height={44} alt={wordmark ? "" : "Zwits"} className="size-11 shrink-0" decoding="async" />
      {wordmark && <span className="font-display text-xl">ZWITS</span>}
    </span>
  );
}