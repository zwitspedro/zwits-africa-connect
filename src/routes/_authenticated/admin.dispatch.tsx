import { createFileRoute } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { DispatchBoard } from '@/components/admin/dispatch-board';
import { listDispatchJobs } from '@/lib/admin-dispatch.functions';
import { dispatchFilters, type DispatchFilters } from '@/lib/admin-dispatch-schema';
import { AdminShell } from '@/components/admin/admin-shell';
import { RoleGate } from '@/components/portal/role-gate';
import { adminHead } from '@/lib/admin-period';
const options=(filters:DispatchFilters)=>queryOptions({queryKey:['admin-dispatch',filters],queryFn:()=>listDispatchJobs({data:filters}),staleTime:15000,refetchInterval:30000});
export const Route=createFileRoute('/_authenticated/admin/dispatch')({ssr:false,validateSearch:(input):Partial<DispatchFilters>=>dispatchFilters.parse(input),loaderDeps:({search})=>dispatchFilters.parse(search),loader:({context,deps})=>context.queryClient.ensureQueryData(options(deps)),head:()=>adminHead('Dispatch & job control','Oversee Zwits service jobs and deliveries, assignments and customer-approved changes.'),component:DispatchPage});
function DispatchPage(){const filters=dispatchFilters.parse(Route.useSearch()),navigate=Route.useNavigate(),q=useSuspenseQuery(options(filters));
 return <RoleGate role="admin"><AdminShell><DispatchBoard filters={filters} data={q.data} navigate={search=>void navigate({search})} refresh={()=>void q.refetch()} fetching={q.isFetching}/></AdminShell></RoleGate>;
}
