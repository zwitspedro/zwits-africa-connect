import {createFileRoute} from '@tanstack/react-router';
import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {adminHead,adminRange,type AdminPeriod} from '@/lib/admin-period';
import {getAdminMetrics} from '@/lib/admin-metrics.functions';
import {SiteShell} from '@/components/site-shell';
import {RoleGate} from '@/components/portal/role-gate';
import {Button} from '@/components/ui/button';
export const Route=createFileRoute('/_authenticated/admin/reports')({head:()=>adminHead('Operational reports','Period-filtered Zwits aggregate reports without personal information.'),component:()=> <RoleGate role="admin"><Reports/></RoleGate>});
function Reports(){const [period,setPeriod]=useState<AdminPeriod>('30days'),range=adminRange(period),fetch=useServerFn(getAdminMetrics);const q=useQuery({queryKey:['admin-report',range],queryFn:()=>fetch({data:range})});
 const exportCsv=()=>{if(!q.data)return;const rows=[['metric','value','from_inclusive','to_exclusive'],...Object.entries(q.data).map(([k,v])=>[k,String(v??''),range.from,range.to])];const csv=rows.map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='zwits-admin-aggregates.csv';a.click();URL.revokeObjectURL(url)};
 return <SiteShell><section className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><h1 className="font-display text-3xl">Operational reports</h1><div className="mt-5 flex flex-wrap gap-2"><select aria-label="Report period" className="min-h-12 rounded-md border border-input bg-background px-3" value={period} onChange={e=>setPeriod(e.target.value as AdminPeriod)}><option value="today">Today</option><option value="7days">Last 7 days</option><option value="30days">Last 30 days</option><option value="month">This month</option><option value="previous">Previous month</option></select><Button disabled={!q.data||q.isError} onClick={exportCsv}>Export aggregates CSV</Button></div><p className="mt-3 text-xs text-muted-foreground">Period metrics use Harare day boundaries; current balances, online counts and queues are point-in-time snapshots.</p>{q.isLoading?<p className="py-8">Loading…</p>:q.error?<p role="alert" className="py-8 text-destructive">Report unavailable. <Button onClick={()=>q.refetch()}>Retry</Button></p>:<dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">{Object.entries(q.data??{}).map(([k,v])=><div key={k} className="min-w-0 border-b border-border py-3"><dt className="break-words text-xs text-muted-foreground">{k.replace(/([A-Z])/g,' $1')}</dt><dd className="mt-1 break-all font-semibold">{v==null?'—':String(v)}</dd></div>)}</dl>}</section></SiteShell>
}
