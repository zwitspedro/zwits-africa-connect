import { createFileRoute } from '@tanstack/react-router';
import { RecordsPage } from '@/components/admin/records-page';
import { adminHead } from '@/lib/admin-period';
export const Route=createFileRoute('/_authenticated/admin/catalogue')({
 validateSearch:(s:Record<string,unknown>):{status?:string;from?:string;to?:string}=>({status:typeof s.status==='string'?s.status:'all',from:typeof s.from==='string'?s.from:undefined,to:typeof s.to==='string'?s.to:undefined}),
 head:()=>adminHead('Service catalogue','Inspect authoritative Zwits service catalogue records in Harare.'),
 component:()=>{const s=Route.useSearch();return <RecordsPage kind="catalogue" title="Service catalogue" initialStatus={s.status} from={s.from} to={s.to}/>},
});
