import { createFileRoute } from '@tanstack/react-router';
import { RecordDetail } from '@/components/admin/record-detail';
import { adminHead } from '@/lib/admin-period';
export const Route=createFileRoute('/_authenticated/admin/bookings_/$id')({
 head:()=>adminHead('Booking investigation','Review Zwits booking history, payments and disputes.'),
 component:()=>{const {id}=Route.useParams();return <RecordDetail kind="booking" id={id}/>},
});
