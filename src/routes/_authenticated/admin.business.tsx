import { createFileRoute } from '@tanstack/react-router';
import { RecordsPage } from '@/components/admin/records-page';
import { adminHead } from '@/lib/admin-period';
export const Route=createFileRoute('/_authenticated/admin/business')({
 validateSearch:(s:Record<string,unknown>):{status?:string;from?:string;to?:string}=>({status:typeof s.status==='string'?s.status:'all',from:typeof s.from==='string'?s.from:undefined,to:typeof s.to==='string'?s.to:undefined}),
 head:()=>adminHead('Business accounts','Inspect authoritative Zwits business accounts records in Harare.'),
 component:()=>{const s=Route.useSearch();return <RecordsPage kind="business" title="Business accounts" initialStatus={s.status} from={s.from} to={s.to}/>},
});
