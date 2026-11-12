import {useState} from 'react';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {toast} from 'sonner';
import {recordDuration} from '@/lib/dispatch-insights.functions';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
export function DeliveryDuration({row}:{row:Record<string,any>}){
 const [open,setOpen]=useState(false),[minutes,setMinutes]=useState(''),[basis,setBasis]=useState(''),[reason,setReason]=useState(''),qc=useQueryClient(),save=useServerFn(recordDuration);
 const m=useMutation({mutationFn:()=>save({data:{id:row.id,expected:row.updated_at,minutes:Number(minutes),basis,reason}}),onSuccess:()=>{setOpen(false);void qc.invalidateQueries();toast.success('Supported duration recorded');},onError:e=>toast.error(e.message)});
 return <section className="mt-4 border-b border-border pb-4"><h3 className="font-semibold">Delivery commitment duration</h3><p className="mt-2 text-sm">{row.duration_minutes?`${row.duration_minutes} minutes · ${row.duration_basis}`:'No supported duration recorded'}</p>{row.duration_recorded_at&&<p className="mt-1 text-xs text-muted-foreground">Recorded {row.duration_recorded_at}</p>}{!row.driver_id&&['pending','matching','offered'].includes(row.status)&&<Button variant="outline" className="mt-2" onClick={()=>{setMinutes(String(row.duration_minutes??''));setOpen(true);}}>Record duration</Button>}<Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>Record supported duration</DialogTitle><DialogDescription>Use an agreed commitment duration and its source. Assigned schedules retain the existing customer and driver approval process.</DialogDescription><label>Duration in minutes<Input aria-label="Duration in minutes" type="number" min={1} max={10080} value={minutes} onChange={e=>setMinutes(e.target.value)}/></label><label>Source / agreed basis<Textarea aria-label="Duration source" value={basis} onChange={e=>setBasis(e.target.value)}/></label><label>Recorded reason<Textarea aria-label="Duration reason" value={reason} onChange={e=>setReason(e.target.value)}/></label><Button disabled={m.isPending||Number(minutes)<1||basis.trim().length<5||reason.trim().length<5} onClick={()=>m.mutate()}>Confirm duration</Button></DialogContent></Dialog></section>;
}