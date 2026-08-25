import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronDown, Search, ShieldCheck, Users } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { RoleGate } from "@/components/portal/role-gate";
import { listAdminCustomers } from "@/lib/admin-metrics.functions";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  head: () => ({ meta: [{ title: "Customers — Zwits admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <AdminCustomers />
    </RoleGate>
  ),
});

function AdminCustomers() {
  const fetchCustomers = useServerFn(listAdminCustomers);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin-customers", search, page],
    queryFn: () => fetchCustomers({ data: { search: search || undefined, page } }),
  });

  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-wider text-primary">
          <ShieldCheck className="size-3" /> Admin
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registered customer accounts. Authentication details are never exposed here.
        </p>

        <div className="relative mt-5 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by name or phone…"
            className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-xs"
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
            No customers found.
          </p>
        ) : (
          <ul className="mt-6 grid gap-2">
            {(list.data?.rows ?? []).map((c: any) => {
              const open = openId === c.user_id;
              return (
                <li key={c.user_id} className="rounded-2xl border border-border/70 bg-card">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : c.user_id)}
                    aria-expanded={open}
                    className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Users className="size-4" />
                      </span>
                      <div>
                        <div className="text-sm font-medium">{c.display_name ?? "Customer"}</div>
                        <div className="text-xs text-muted-foreground">
                          Joined {new Date(c.created_at).toLocaleDateString()} · {c.bookings_count}{" "}
                          booking{c.bookings_count === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`size-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open && (
                    <dl className="grid grid-cols-2 gap-3 border-t border-border/60 px-4 py-3 text-xs sm:grid-cols-4">
                      <div>
                        <dt className="text-muted-foreground">Phone</dt>
                        <dd className="mt-0.5 font-medium">{c.phone ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Location</dt>
                        <dd className="mt-0.5 font-medium">
                          {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Account type</dt>
                        <dd className="mt-0.5 font-medium capitalize">{c.account_type}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Last activity</dt>
                        <dd className="mt-0.5 font-medium">
                          {new Date(c.updated_at).toLocaleDateString()}
                        </dd>
                      </div>
                    </dl>
                  )}
                </li>
              );
            })}
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
              Page {page + 1} of {pages} · {total} customers
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
