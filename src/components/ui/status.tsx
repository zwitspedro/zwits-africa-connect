import { CheckCircle2, Circle, Clock3, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const success = new Set(["completed", "approved", "accepted", "online", "uploaded", "paid", "verified", "delivered", "resolved"]);
const danger = new Set(["cancelled", "rejected", "revoked", "upload_error", "failed"]);
const active = new Set(["matching", "in_progress", "en_route", "picked_up", "arriving", "travelling", "arrived", "assigned", "started"]);
const pending = new Set(["requested", "pending", "pending_verification", "processing", "offered"]);

/** Presentation only: never derives lifecycle transitions or authorization. */
export function Status({ status, className }: { status: string; className?: string }) {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  const tone = success.has(normalized) ? "bg-success-surface text-success" : danger.has(normalized) ? "bg-danger-surface text-danger" : active.has(normalized) ? "bg-info-surface text-info" : pending.has(normalized) ? "bg-warning-surface text-warning" : "bg-muted text-muted-foreground";
  const Icon = success.has(normalized) ? CheckCircle2 : danger.has(normalized) ? XCircle : active.has(normalized) ? Loader2 : pending.has(normalized) ? Clock3 : Circle;
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold", tone, className)}>
      <Icon aria-hidden="true" className={cn("size-3.5 shrink-0", active.has(normalized) && "zwits-status-active")} />
      <span className="min-w-0 break-words uppercase">{status.replace(/_/g, " ")}</span>
    </span>
  );
}