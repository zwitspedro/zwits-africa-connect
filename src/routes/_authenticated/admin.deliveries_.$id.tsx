import { createFileRoute } from '@tanstack/react-router';
import { RecordDetail } from '@/components/admin/record-detail';
import { adminHead } from '@/lib/admin-period';
export const Route=createFileRoute('/_authenticated/admin/deliveries_/$id')({
 head:()=>adminHead('Delivery investigation','Review Zwits delivery history, payments and disputes.'),
 component:()=>{const {id}=Route.useParams();return <RecordDetail kind="delivery" id={id}/>},
});
