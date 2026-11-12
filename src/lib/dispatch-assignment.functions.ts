import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {bulkAssignmentSchema,replacementSchema,checkAssignmentSchema,type AssignmentCheck} from './dispatch-assignment-schema';
export const checkAssignment=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(v=>checkAssignmentSchema.parse(v)).handler(async({data,context})=>{
 const {data:allowed,error:e}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(e||!allowed)throw new Error('Forbidden');
 const {data:r,error}=await context.supabase.rpc('dispatch_assignment_check',{_kind:data.kind,_id:data.id,_assignee:data.assignee,_start:data.start,_end:data.end});if(error)throw new Error(error.message);return r as unknown as AssignmentCheck;
});
export const bulkAssign=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(v=>bulkAssignmentSchema.parse(v)).handler(async({data,context})=>{
 const {data:allowed,error:e}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(e||!allowed)throw new Error('Forbidden');
 const {data:r,error}=await context.supabase.rpc('admin_bulk_assign',{_jobs:data.jobs,_reason:data.reason,_preview:data.preview});if(error)throw new Error(error.message);return r as unknown as {results:AssignmentCheck[];preview:boolean};
});
export const requestDriverReplacement=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(v=>replacementSchema.parse(v)).handler(async({data,context})=>{
 const {data:allowed,error:e}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(e||!allowed)throw new Error('Forbidden');
 const {data:r,error}=await context.supabase.rpc('admin_request_driver_reassignment',{_id:data.id,_replacement:data.replacement,_expected:data.expected,_key:data.key,_reason:data.reason,_location:data.location});if(error)throw new Error(error.message);return r as unknown as AssignmentCheck;
});
export const listDriverReplacements=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(v=>z.object({deliveryId:z.string().uuid().optional()}).parse(v)).handler(async({data,context})=>{
 let q=context.supabase.from('delivery_reassignments').select('*').order('created_at',{ascending:false}).limit(50);
 if(data.deliveryId)q=q.eq('delivery_id',data.deliveryId);else q=q.in('status',['awaiting_replacement','awaiting_handover']).or(`previous_driver.eq.${context.userId},replacement_driver.eq.${context.userId}`);
 const {data:rows,error}=await q;if(error)throw new Error('Replacement history unavailable');return {rows:rows??[],userId:context.userId};
});
export const respondDriverReplacement=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(v=>z.object({id:z.string().uuid(),decision:z.enum(['accept','reject','handover'])}).parse(v)).handler(async({data,context})=>{
 const {data:r,error}=await context.supabase.rpc('respond_driver_reassignment',{_id:data.id,_decision:data.decision});if(error)throw new Error(error.message);return r as unknown as AssignmentCheck;
});
export const withdrawDriverReplacement=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(v=>z.object({id:z.string().uuid(),reason:z.string().trim().min(5).max(1000)}).parse(v)).handler(async({data,context})=>{
 const {data:allowed,error:e}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(e||!allowed)throw new Error('Forbidden');
 const {error}=await context.supabase.rpc('admin_withdraw_driver_reassignment',{_id:data.id,_reason:data.reason});if(error)throw new Error(error.message);return {ok:true};
});