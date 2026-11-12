import {useQuery} from '@tanstack/react-query';
import {checkAssignment} from '@/lib/dispatch-assignment.functions';
import {AssignmentConflicts} from './assignment-conflicts';
import {deliveryAlternatives} from '@/lib/dispatch-insights.functions';
export function AssignmentPreview({kind,id,assignee}:{kind:'booking'|'delivery';id:string;assignee:string}){
 const q=useQuery({queryKey:['admin-assignment-check',kind,id,assignee],queryFn:()=>checkAssignment({data:{kind,id,assignee}}),enabled:!!assignee});
 const slots=useQuery({queryKey:['admin-alternatives',id,assignee],queryFn:()=>deliveryAlternatives({data:{id,assignee}}),enabled:kind==='delivery'&&!!assignee&&q.data?.ok===false});
 if(!assignee)return null;
 return q.isPending?<p className="text-xs">Checking commitments…</p>:q.error?<p role="alert" className="text-xs text-danger">Assignment checks unavailable; no timing guarantee can be made.</p>:q.data?<><AssignmentConflicts result={q.data}/>{slots.data&&<div className="text-xs"><p>{slots.data.limitation}</p>{slots.data.slots.map(s=><p key={s.start}>Alternative: {new Date(s.start).toLocaleString('en-ZW',{timeZone:'Africa/Harare'})} — {new Date(s.end).toLocaleString('en-ZW',{timeZone:'Africa/Harare'})}</p>)}</div>}</>:null;
}