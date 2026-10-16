import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getAdminRecord } from '@/lib/admin-records.functions';
import { SiteShell } from '@/components/site-shell';
import { RoleGate } from '@/components/portal/role-gate';
import { Button } from '@/components/ui/button';
import { Status } from '@/components/ui/status';
export function RecordDetail({kind,id}:{kind:'booking'|'delivery';id:string}) {return <RoleGate role="admin"><Detail kind={kind} id={id}/></RoleGate>}
function Detail({kind,id}:{kind:'booking'|'delivery';id:string}) {
 const fetch=useServerFn(getAdminRecord),q=useQuery({queryKey:['admin-record',kind,id],queryFn:()=>fetch({data:{kind,id}})});
 return <SiteShell><section className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><h1 className="font-display text-2xl capitalize">{kind} investigation</h1><p className="mt-2 break-all text-xs text-muted-foreground">{id}</p>
 {q.isLoading?<p className="py-8">Loading…</p>:q.error?<p role="alert" className="py-8 text-destructive">Record history unavailable. <Button variant="outline" onClick={()=>q.refetch()}>Retry</Button></p>:q.data&&<>
 <Status status={q.data.row.status}/><dl className="mt-6 grid grid-cols-2 gap-4 text-sm">{Object.entries(q.data.row).filter(([k])=>!['photos','lat','lng','pickup_lat','pickup_lng','dropoff_lat','dropoff_lng'].includes(k)).map(([k,v])=><div key={k} className="min-w-0"><dt className="text-muted-foreground">{k.replaceAll('_',' ')}</dt><dd className="mt-1 break-all">{v==null?'—':String(v)}</dd></div>)}</dl>
 <h2 className="mt-8 border-t border-border pt-5 font-display text-lg">Authoritative timeline</h2><ol className="mt-4 space-y-3">{q.data.events.map(e=><li key={e.id} className="border-l-2 border-border pl-4 text-sm">{'status' in e?e.status:e.event}<time className="block text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</time></li>)}</ol>{!q.data.events.length&&<p className="mt-3 text-sm text-muted-foreground">No recorded events.</p>}
 <h2 className="mt-8 border-t border-border pt-5 font-display text-lg">Payments</h2>{q.data.payments.map(p=><p key={p.id} className="mt-3 text-sm">{p.currency} {p.amount} · {p.payment_method} · {p.status} {p.failure_reason}</p>)}{!q.data.payments.length&&<p className="mt-3 text-sm text-muted-foreground">No payment records.</p>}
 <h2 className="mt-8 border-t border-border pt-5 font-display text-lg">Disputes</h2>{q.data.disputes.map(d=><p key={d.id} className="mt-3 text-sm">{d.reason} · {d.status} · {d.resolution}</p>)}{!q.data.disputes.length&&<p className="mt-3 text-sm text-muted-foreground">No disputes.</p>}
 {kind==='booking'&&<Button variant="outline" asChild className="mt-6"><Link to="/admin/reconciliation/booking/$bookingId" params={{bookingId:id}}>Financial reconciliation</Link></Button>}
 </>}
 </section></SiteShell>;
}
