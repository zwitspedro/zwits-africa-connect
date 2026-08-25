import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertTriangle, ArrowRight, ShieldCheck, UploadCloud } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { RoleGate } from "@/components/portal/role-gate";
import { listAdminUploads } from "@/lib/admin-metrics.functions";

export const Route = createFileRoute("/_authenticated/admin/uploads")({
  head: () => ({ meta: [{ title: "Failed uploads — Zwits admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <AdminUploads />
    </RoleGate>
  ),
});

function AdminUploads() {
  const fetchUploads = useServerFn(listAdminUploads);
  const [page, setPage] = useState(0);

  const list = useQuery({
    queryKey: ["admin-uploads", page],
    queryFn: () => fetchUploads({ data: { page } }),
  });

  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-wider text-primary">
          <ShieldCheck className="size-3" /> Admin
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold">Failed uploads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Provider document submissions that were rejected or errored. Files stay in private
          storage — open the provider's verification workflow to review them.
        </p>

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
            No failed or rejected uploads.
          </p>
        ) : (
          <ul className="mt-6 grid gap-2">
            {(list.data?.rows ?? []).map((u: any) => (
              <li key={u.id} className="rounded-2xl border border-border/70 bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <UploadCloud className="size-4 text-muted-foreground" />
                    {u.provider_name}
                    <span className="text-xs text-muted-foreground">· {u.doc_key}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                      u.status === "rejected"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    <AlertTriangle className="size-3" /> {u.status.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {u.file_name ?? "Unnamed file"}
                  {u.file_size ? ` · ${(Number(u.file_size) / 1024).toFixed(0)} KB` : ""} ·{" "}
                  {new Date(u.created_at).toLocaleString()}
                </div>
                {Array.isArray(u.errors) && u.errors.length > 0 && (
                  <div className="mt-1 text-xs text-destructive">
                    {u.errors.filter(Boolean).join(" · ")}
                  </div>
                )}
                <Link
                  to="/admin/providers"
                  className="mt-2 inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] hover:bg-muted"
                >
                  Open verification queue <ArrowRight className="size-3" />
                </Link>
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
              Page {page + 1} of {pages} · {total} uploads
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
