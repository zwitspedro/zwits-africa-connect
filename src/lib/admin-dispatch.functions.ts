import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { dispatchFilters, controlSchema, responseSchema } from './admin-dispatch-schema';

export const listDispatchJobs = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(input=>dispatchFilters.parse(input)).handler(async({data,context})=>{
 const {data:allowed,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
 if(roleError||!allowed) throw new Error('Forbidden');
 const { readDispatchJobs }=await import('./admin-dispatch.server');
 return readDispatchJobs(data);
});
export const getDispatchJob = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(input=>z.object({kind:z.enum(['booking','delivery']),id:z.string().uuid()}).parse(input)).handler(async({data,context})=>{
 const {data:allowed,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
 if(roleError||!allowed) throw new Error('Forbidden');
 const {readDispatchJob}=await import('./admin-dispatch.server'); return readDispatchJob(data.kind,data.id);
});
export const dispatchAction = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(input=>controlSchema.parse(input)).handler(async({data,context})=>{
 const {data:allowed,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
 if(roleError||!allowed) throw new Error('Forbidden');
 const {validateDispatchPatch}=await import('./admin-dispatch.server');
 const patch=data.action==='propose'?await validateDispatchPatch(data.kind,data.id,data.patch??{}):{};
 const {data:result,error}=await context.supabase.rpc('admin_dispatch_action',{_kind:data.kind,_id:data.id,_expected:data.expected,_key:data.key,_action:data.action,_reason:data.reason,_assignee:data.assignee??undefined,_patch:patch as any});
 if(error) throw new Error(error.message); return result;
});
export const listJobChanges = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const {data,error}=await context.supabase.from('admin_job_changes').select('*').or(`customer_id.eq.${context.userId},assignee_user_id.eq.${context.userId}`).in('status',['pending_customer','pending_assignee']).order('created_at',{ascending:false}).limit(50);
 if(error) throw new Error('Unable to load job changes'); return {rows:data??[],userId:context.userId};
});
export const respondJobChange = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(input=>responseSchema.parse(input)).handler(async({data,context})=>{
 const {data:result,error}=await context.supabase.rpc('respond_admin_job_change',{_id:data.id,_decision:data.decision});
 if(error) throw new Error(error.message);return result;
});
export const getDispatchDrivers = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(input=>z.object({id:z.string().uuid().optional()}).parse(input)).handler(async({data,context})=>{
 const {data:allowed,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(roleError||!allowed) throw new Error('Forbidden');
 const {readDispatchDrivers}=await import('./admin-dispatch.server');return readDispatchDrivers(data.id);
});
