import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { FileSearch, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { RoleGate } from "@/components/portal/role-gate";
import { AuditExportButtons } from "@/components/audit-export-buttons";
import { listAuditLog } from "@/lib/admin-metrics.functions";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [{ title: "Audit log — Zwits admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <AdminAudit />
    </RoleGate>
  ),
});

const SUBJECT_TYPES = ["provider", "booking", "delivery", "payment", "withdrawal", "dispute", "commission_rate", "user"];

function AdminAudit() {
  const fetchAudit = useServerFn(listAuditLog);
  const [page, setPage] = useState(0);
  const [action, setAction] = useState("");
  const [subjectType, setSubjectType] = useState("");
  const [actor, setActor] = useState("");

  const filters = {
    page,
    action: action.trim() || undefined,
    subjectType: subjectType || undefined,
    actor: actor.trim() || undefined,
  };

  const list = useQuery({
    queryKey: ["admin-audit", filters],
    queryFn: () => fetchAudit({ data: filters }),
  });

  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-wider text-primary">
              <ShieldCheck className="size-3" /> Admin
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold">Audit log</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every privileged action on the platform, newest first.
            </p>
          </div>
          <AuditExportButtons
            rows={list.data?.rows as any}
            filenameBase="admin-audit-log"
            pdfTitle="Admin audit log"
            pdfSubtitle={`${total} events (page ${page + 1})`}
            size="sm"
          />
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <input
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(0);
            }}
            placeholder="Filter by action…"
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs"
          />
          <select
            value={subjectType}
            onChange={(e) => {
              setSubjectType(e.target.value);
              setPage(0);
            }}
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs"
          >
            <option value="">All entity types</option>
            {SUBJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={actor}
            onChange={(e) => {
              setActor(e.target.value);
              setPage(0);
            }}
            placeholder="Actor user ID (UUID)…"
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs"
          />
        </div>

        {list.isLoading ? (
          <div className="mt-6 h-40 animate-pulse rounded-2xl bg-muted/50" />
        ) : list.error ? (
          <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {(list.error as Error).message}{" "}
            <button onClick={() => list.refetch()} className="ml-2 underline">
              Retry
            </button>
          </div>
        ) : (list.data?.rows ?? []).length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No audit events match these filters.
          </p>
        ) : (
          <ul className="mt-6 grid gap-1.5">
            {(list.data?.rows ?? []).map((r: any) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border/60 bg-card px-3 py-2 text-[11px]"
              >
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <FileSearch className="size-3" />
                  {new Date(r.created_at).toLocaleString()}
                </span>
                <span className="font-medium">{r.action}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {r.subject_type}
                </span>
                {r.subject_id && (
                  <span className="text-muted-foreground">
                    ref {String(r.subject_id).slice(0, 8).toUpperCase()}
                  </span>
                )}
                {r.actor && (
                  <span className="text-muted-foreground">
                    by {String(r.actor).slice(0, 8).toUpperCase()}
                  </span>
                )}
                {r.metadata && Object.keys(r.metadata).length > 0 && (
                  <span className="w-full truncate text-muted-foreground/80">
                    {JSON.stringify(r.metadata)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-full border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {page + 1} of {pages} · {total} events
            </span>
            <button
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-full border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </SiteShell>
  );
}
