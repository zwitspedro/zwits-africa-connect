import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { listAdminRecords } from '@/lib/admin-records.functions';
import { SiteShell } from '@/components/site-shell';
import { RoleGate } from '@/components/portal/role-gate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Status } from '@/components/ui/status';
export type RecordKind = 'bookings'|'deliveries'|'drivers'|'wallets'|'business'|'catalogue';
export function RecordsPage({kind,title,initialStatus='all',from,to}:{kind:RecordKind;title:string;initialStatus?:string;from?:string;to?:string}) {
 return <RoleGate role="admin"><Records kind={kind} title={title} initialStatus={initialStatus} from={from} to={to}/></RoleGate>;
}
function Records({kind,title,initialStatus,from,to}:{kind:RecordKind;title:string;initialStatus:string;from?:string;to?:string}) {
 const [page,setPage]=useState(0),[term,setTerm]=useState(''),[draft,setDraft]=useState(''),[status,setStatus]=useState(initialStatus);
 const fetch=useServerFn(listAdminRecords);
 const q=useQuery({queryKey:['admin-records',kind,page,term,status,from,to],queryFn:()=>fetch({data:{kind,page,term,status,from,to}})});
 const statuses = kind==='bookings'?['all','matching','offered','accepted','travelling','arrived','in_progress','completed','cancelled']:kind==='deliveries'?['all','requested','matching','accepted','picked_up','delivered','cancelled','failed']:kind==='drivers'?['all','online','pending','approved','revoked']:kind==='wallets'?['all','positive','debt']:kind==='catalogue'?['all','active','inactive']:['all'];
 return <SiteShell><section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
 <h1 className="font-display text-3xl">{title}</h1>
 {kind==='wallets'&&<p className="mt-2 text-sm text-muted-foreground">USD balances. Negative balances are commission owed; positive balances are withdrawable funds.</p>}
 {kind==='business'&&<p className="mt-2 text-sm text-muted-foreground">Registered business-role accounts. Invoicing, teams and bulk dispatch are not connected.</p>}
 {kind==='catalogue'&&<p className="mt-2 text-sm text-muted-foreground">Database service registry. Public discovery uses the existing curated catalogue; editing is unavailable until both sources are safely synchronized.</p>}
 <form onSubmit={e=>{e.preventDefault();setTerm(draft);setPage(0)}} className="mt-5 flex flex-wrap items-center gap-2">
 {kind!=='business'&&<><Input className="max-w-sm" aria-label="Search records" placeholder={kind==='bookings'||kind==='deliveries'?'Full reference, account ID or service':kind==='wallets'?'Full provider account ID':'Search by name'} value={draft} onChange={e=>setDraft(e.target.value)}/><Button type="submit">Search</Button></>}
 {statuses.length>1&&<select aria-label="Record status" className="min-h-12 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={e=>{setStatus(e.target.value);setPage(0)}}>{statuses.map(s=><option key={s}>{s}</option>)}</select>}
 <Button variant="outline" type="button" onClick={()=>q.refetch()}>Refresh</Button>
 </form>
 {(from||to)&&<p className="mt-3 text-xs text-muted-foreground">Created between {from} and {to} (end exclusive).</p>}
 {q.isLoading?<p role="status" className="py-8">Loading records…</p>:q.error?<div role="alert" className="py-8 text-destructive">Unable to load records. <Button variant="outline" onClick={()=>q.refetch()}>Retry</Button></div>:<>
 <p className="mt-4 text-xs text-muted-foreground">{q.data?.total} records · Refreshed {new Date(q.dataUpdatedAt).toLocaleTimeString()}</p>
 <ul className="mt-4 grid gap-3">{q.data?.rows.map(r=><li key={r.id??r.provider_user_id??r.user_id} className="min-w-0 rounded-lg border border-border bg-card p-4">
 <div className="flex flex-wrap items-center justify-between gap-2"><strong className="break-all text-sm">{r.business_name??r.full_name??r.display_name??r.name??r.category??r.service_tier??r.provider_user_id??r.user_id??r.id}</strong>{(r.status??r.verification_status)&&<Status status={r.status??r.verification_status}/>}</div>
 <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">{Object.entries(r).filter(([k])=>!['name','description','full_name','display_name','status','verification_status'].includes(k)).map(([k,v])=><div key={k} className="min-w-0"><dt className="text-muted-foreground">{k.replaceAll('_',' ')}</dt><dd className="mt-1 break-all">{v==null?'—':String(v)}</dd></div>)}</dl>
 {kind==='bookings'&&<Button asChild variant="outline" className="mt-3"><Link to="/admin/bookings/$id" params={{id:r.id}} search={{}}>Open booking</Link></Button>}
 {kind==='deliveries'&&<Button asChild variant="outline" className="mt-3"><Link to="/admin/deliveries/$id" params={{id:r.id}} search={{}}>Open delivery</Link></Button>}
 {kind==='wallets'&&r.provider_id&&<Button asChild variant="outline" className="mt-3"><Link to="/admin/reconciliation/provider/$providerId" params={{providerId:r.provider_id}} search={{from:undefined,to:undefined}}>Inspect ledger</Link></Button>}
 </li>)}</ul>
 {!q.data?.rows.length&&<p className="py-8 text-muted-foreground">No matching records.</p>}
 <div className="mt-6 flex items-center justify-between gap-2"><Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</Button><span className="text-xs">Page {page+1}</span><Button variant="outline" disabled={(page+1)*25>=(q.data?.total??0)} onClick={()=>setPage(p=>p+1)}>Next</Button></div>
 </>}
 </section></SiteShell>;
}
