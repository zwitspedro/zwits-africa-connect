import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Status } from '@/components/ui/status';
import { Panel } from '@/components/provider/dashboard-kit';
import { getDriverApplications, submitDriverVerification } from '@/lib/driver-verification.functions';

export function VerificationApplication({ profile }: { profile: { id: string; verification_status: string } | null | undefined }) {
  const [identity, setIdentity] = useState(''), [licence, setLicence] = useState('');
  const qc = useQueryClient(), submit = useServerFn(submitDriverVerification), read = useServerFn(getDriverApplications);
  const history = useQuery({ queryKey: ['driver-applications', profile?.id], enabled: !!profile, queryFn: () => { if (!profile) return []; return read({ data: { profileId: profile.id } }); } });
  const save = useMutation({ mutationFn: () => submit({ data: { identity, licence } }), onSuccess: () => { toast.success('Application submitted for admin review'); setIdentity(''); setLicence(''); void qc.invalidateQueries({ queryKey: ['driver-profile'] }); void qc.invalidateQueries({ queryKey: ['driver-applications'] }); }, onError: (e: Error) => toast.error(e.message) });
  const locked = ['pending', 'approved'].includes(profile?.verification_status ?? '');
  return <Panel title="Driver verification" description="Identity, licence and vehicle review">
    <Status status={profile?.verification_status ?? 'unverified'} />
    {history.isError && <p role="alert" className="mt-3 text-destructive">Application history unavailable.</p>}
    {history.data?.map(a => <div key={a.id} className="mt-4 border-b border-border pb-3 text-sm"><p>Submitted {new Date(a.submitted_at).toLocaleString()} · {a.status}</p>{a.review_reason && <p className="mt-1">Admin decision: {a.review_reason}</p>}</div>)}
    {locked ? <p className="mt-4 text-sm text-muted-foreground">{profile?.verification_status === 'approved' ? 'Approved. Changing your ID, licence or vehicle requires a new review.' : 'Awaiting admin review. Verification documents and vehicles are locked until a decision.'}</p> : <form className="mt-4 space-y-4" onSubmit={e => { e.preventDefault(); save.mutate(); }}>
      <label className="block text-sm">National ID number<input required minLength={5} maxLength={40} value={identity} onChange={e => setIdentity(e.target.value)} className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3" /></label>
      <label className="block text-sm">Driver’s licence number<input required minLength={3} maxLength={40} value={licence} onChange={e => setLicence(e.target.value)} className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3" /></label>
      <p className="text-sm text-muted-foreground">Required: saved personal details, active vehicle, ID, licence, registration and current insurance.</p>
      <Button type="submit" disabled={!profile || save.isPending}>{save.isPending ? 'Submitting…' : 'Submit for verification'}</Button>
    </form>}
  </Panel>;
}