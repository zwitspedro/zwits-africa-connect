import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Status } from "@/components/ui/status";
import { listDisputes, openDispute } from "@/lib/disputes.functions";

export function DisputePanel({ bookingId, status }: { bookingId: string; status: string }) {
  const fetch = useServerFn(listDisputes);
  const submitIssue = useServerFn(openDispute);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const issues = useQuery({ queryKey: ["disputes", bookingId], queryFn: () => fetch({ data: { bookingId, page: 0 } }), refetchInterval: 30000 });
  const rows = issues.data?.rows ?? [];
  const active = rows.some(d => ["open", "investigating"].includes(d.status));
  const eligible = !["pending", "matching", "offered"].includes(status);
  const submit = useMutation({
    mutationFn: () => submitIssue({ data: { bookingId, reason, description } }),
    onSuccess: () => { setOpen(false); setReason(""); setDescription(""); toast.success("Issue submitted"); void qc.invalidateQueries({ queryKey: ["disputes"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return <section className="mt-5 border-t border-border pt-4" aria-label="Job issues">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Issues & resolutions</h2>{eligible && !active && <Button variant="outline" disabled={issues.isPending || !!issues.error} onClick={() => setOpen(!open)}>{open ? "Cancel" : "Report an issue"}</Button>}</div>
    {issues.isPending && <p role="status" className="mt-3 text-sm text-muted-foreground">Loading issues…</p>}
    {issues.error && <div role="alert" className="mt-3 text-sm text-destructive">Issues unavailable. <Button variant="outline" onClick={() => issues.refetch()}>Retry</Button></div>}
    <ul className="mt-3 grid gap-3">{rows.map(d => <li key={d.id} className="border-l-2 border-border pl-3"><div className="flex flex-wrap justify-between gap-2"><strong className="break-words text-sm">{d.reason}</strong><Status status={d.status}/></div>{d.description && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{d.description}</p>}{d.resolution && <p className="mt-2 whitespace-pre-wrap break-words text-sm">Decision: {d.resolution}</p>}<p className="mt-1 text-xs text-muted-foreground">Submitted {new Date(d.created_at).toLocaleString()}{d.resolved_at && ` · Closed ${new Date(d.resolved_at).toLocaleString()}`}</p></li>)}</ul>
    {open && !active && <form className="mt-4 grid gap-3" onSubmit={e => { e.preventDefault(); submit.mutate(); }}><label className="grid gap-1 text-sm">Issue summary<Input required minLength={3} maxLength={120} value={reason} onChange={e => setReason(e.target.value)}/></label><label className="grid gap-1 text-sm">What happened?<Textarea maxLength={2000} rows={3} value={description} onChange={e => setDescription(e.target.value)}/></label><Button disabled={submit.isPending || reason.trim().length < 3}>{submit.isPending ? "Submitting…" : "Submit issue"}</Button></form>}
  </section>;
}