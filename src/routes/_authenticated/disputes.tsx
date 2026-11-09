import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listDisputes } from "@/lib/disputes.functions";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Status } from "@/components/ui/status";
export const Route = createFileRoute("/_authenticated/disputes")({
  head: () => ({ meta: [{ title: "My issues & resolutions — Zwits" }, { name: "description", content: "Track issues and review Zwits decisions for your jobs." }, { property: "og:title", content: "My issues & resolutions — Zwits" }, { property: "og:description", content: "Track issues and review decisions for your Zwits jobs." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Issues,
});
function Issues() {
  const fetch = useServerFn(listDisputes);
  const [page, setPage] = useState(0);
  const issues = useQuery({ queryKey: ["disputes", "list", page], queryFn: () => fetch({ data: { page } }), refetchInterval: 30000 });
  return <SiteShell><main className="mx-auto max-w-3xl px-4 py-8"><h1 className="font-display text-2xl">My issues & resolutions</h1>{issues.isPending && <p role="status">Loading…</p>}{issues.error && <div role="alert">Issues unavailable. <Button onClick={() => issues.refetch()}>Retry</Button></div>}<ul className="mt-6 grid gap-4">{issues.data?.rows.map(d => <li key={d.id} className="border-b border-border pb-4"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold">{d.reason}</h2><Status status={d.status}/></div><p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{d.description}</p>{d.resolution && <p className="mt-3 whitespace-pre-wrap break-words">Decision: {d.resolution}</p>}<p className="mt-2 text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}{d.resolved_at && ` · Closed ${new Date(d.resolved_at).toLocaleString()}`}</p></li>)}</ul>{issues.data?.total === 0 && <p className="mt-6 text-muted-foreground">No issues submitted.</p>}<div className="mt-6 flex gap-3"><Button variant="outline" disabled={page===0} onClick={() => setPage(page-1)}>Previous</Button><Button variant="outline" disabled={(page+1)*25 >= (issues.data?.total ?? 0)} onClick={() => setPage(page+1)}>Next</Button><Button asChild variant="outline"><Link to="/provider/dashboard">Provider dashboard</Link></Button></div></main></SiteShell>;
}