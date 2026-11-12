import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getDriverApplications, reviewDriverApplication, signDriverDocument } from '@/lib/driver-verification.functions';

export function DriverVerificationReview({ profileId }: { profileId: string }) {
  const read = useServerFn(getDriverApplications), review = useServerFn(reviewDriverApplication), sign = useServerFn(signDriverDocument), qc = useQueryClient();
  const [reason, setReason] = useState(''), [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const q = useQuery({ queryKey: ['driver-applications', profileId], queryFn: () => read({ data: { profileId } }) });
  const save = useMutation({ mutationFn: (application: string) => { if (!decision) throw new Error('Choose a decision'); return review({ data: { application, status: decision, reason } }); }, onSuccess: () => { toast.success('Driver decision recorded and notification sent'); setDecision(null); setReason(''); void qc.invalidateQueries({ queryKey: ['driver-applications'] }); void qc.invalidateQueries({ queryKey: ['admin-dispatch-driver'] }); void qc.invalidateQueries({ queryKey: ['admin-dispatch-drivers'] }); }, onError: (e: Error) => toast.error(e.message) });
  const document = useMutation({ mutationFn: (input: { application: string; key: 'id' | 'licence' | 'registration' }) => sign({ data: input }), onSuccess: result => window.open(result.url, '_blank', 'noopener,noreferrer'), onError: (e: Error) => toast.error(e.message) });
  return <section className="mt-8 border-t border-border pt-6"><h2 className="font-display text-lg">Verification applications</h2>
    {q.isPending && <p className="py-4">Loading applications…</p>}{q.isError && <p role="alert" className="py-4 text-destructive">Applications unavailable. <Button variant="outline" onClick={() => void q.refetch()}>Retry</Button></p>}
    {q.data?.length === 0 && <p className="py-4 text-muted-foreground">No submitted application. The driver must submit their ID and vehicle evidence before approval.</p>}
    {q.data?.map(a => <article key={a.id} className="mt-4 border-b border-border pb-6"><p className="font-semibold">{a.status} · {new Date(a.submitted_at).toLocaleString()}</p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{Object.entries(a.details as Record<string, unknown>).map(([k,v]) => <div key={k}><dt className="text-muted-foreground">{k.replaceAll('_',' ')}</dt><dd className="break-words">{String(v ?? '—')}</dd></div>)}</dl>
      <h3 className="mt-4 font-semibold">Submitted vehicles</h3>{(a.vehicle_snapshot as Array<Record<string, unknown>>).map((v,i) => <p className="mt-2 text-sm" key={i}>{[v.vehicle_type,v.make,v.model,v.plate,v.colour].filter(Boolean).join(' · ')}</p>)}
      <div className="mt-4 flex flex-wrap gap-2">{(['id','licence','registration'] as const).map(key => <Button key={key} variant="outline" disabled={document.isPending} onClick={() => document.mutate({ application: a.id, key })}>View {key === 'id' ? 'ID' : key}</Button>)}</div>
      {a.review_reason && <p className="mt-4 text-sm">Decision: {a.review_reason} · {a.reviewed_at ? new Date(a.reviewed_at).toLocaleString() : ''}</p>}
      {a.status === 'pending' && <div className="mt-4 space-y-3"><label className="block text-sm">Review reason<textarea minLength={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} className="mt-2 min-h-24 w-full rounded-md border border-input bg-background p-3" /></label>
        <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => setDecision('approved')}>Approve driver</Button><Button variant="destructive" onClick={() => setDecision('rejected')}>Reject application</Button></div>
        {decision && <div role="alert" className="space-y-3 border-t border-border pt-4"><p>Confirm {decision === 'approved' ? 'approval' : 'rejection'}? The driver will receive your reason.</p><Button disabled={save.isPending || reason.trim().length < 3} onClick={() => save.mutate(a.id)}>Confirm decision</Button><Button variant="ghost" onClick={() => setDecision(null)}>Cancel</Button></div>}
      </div>}
    </article>)}
  </section>;
}