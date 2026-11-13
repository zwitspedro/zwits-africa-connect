import { createFileRoute,Link } from '@tanstack/react-router';
import { queryOptions,useSuspenseQuery } from '@tanstack/react-query';
import { getDispatchDrivers } from '@/lib/admin-dispatch.functions';
import { AdminShell } from '@/components/admin/admin-shell';
import { RoleGate } from '@/components/portal/role-gate';
import { Status } from '@/components/ui/status';
import { adminHead } from '@/lib/admin-period';
const options=queryOptions({queryKey:['admin-dispatch-drivers'],queryFn:()=>getDispatchDrivers({data:{}})});
export const Route=createFileRoute('/_authenticated/admin/dispatch-drivers')({ssr:false,loader:({context})=>context.queryClient.ensureQueryData(options),head:()=>adminHead('Driver operations','Review Zwits driver capacity, verification and assigned delivery workload.'),component:Drivers});
function Drivers(){const q=useSuspenseQuery(options);return <RoleGate role="admin"><AdminShell><section className="dispatch-presentation px-4 py-8 sm:px-6"><h1 className="font-display text-2xl">Driver operations</h1><div className="mt-6 divide-y divide-border">{q.data.rows.map(d=><article key={d.id} className="py-5"><Link to="/admin/dispatch-drivers/$id" params={{id:d.id}} className="inline-flex min-h-12 items-center break-words font-semibold text-primary-text">{d.full_name||'Driver'} · {d.user_id.slice(0,8)}</Link><div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><Status status={d.verification_status}/><span>{d.available?'Online':'Offline'} · {d.load} active jobs · {d.deliveries_completed} completed</span><span>{d.vehicles.map(v=>v.vehicle_type).join(', ')||'No active vehicle'}</span></div></article>)}{!q.data.rows.length&&<p className="py-10 text-muted-foreground">No registered drivers.</p>}</div></section></AdminShell></RoleGate>;}
