import {useQuery} from '@tanstack/react-query';
import {checkAssignment} from '@/lib/dispatch-assignment.functions';
import {AssignmentConflicts} from './assignment-conflicts';
export function AssignmentPreview({kind,id,assignee}:{kind:'booking'|'delivery';id:string;assignee:string}){
 const q=useQuery({queryKey:['admin-assignment-check',kind,id,assignee],queryFn:()=>checkAssignment({data:{kind,id,assignee}}),enabled:!!assignee});
 if(!assignee)return null;
 return q.isPending?<p className="text-xs">Checking commitments…</p>:q.error?<p role="alert" className="text-xs text-danger">Assignment checks unavailable; no timing guarantee can be made.</p>:q.data?<AssignmentConflicts result={q.data}/>:null;
}