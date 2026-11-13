import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { dispatchFilters, controlSchema, responseSchema, prioritySchema, batchSchema } from './admin-dispatch-schema';
import type { DispatchLocation } from './provider-location';

export const getDispatchLocations = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const {data:allowed,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
 if(roleError||!allowed) throw new Error('Forbidden');
 const {data,error}=await context.supabase.rpc('admin_dispatch_locations');
 if(error) throw new Error('Provider locations unavailable');
 return data as unknown as {rows:DispatchLocation[];total:number};
});

export const listDispatchJobs = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(input=>dispatchFilters.parse(input)).handler(async({data,context})=>{
 const {data:allowed,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
 if(roleError||!allowed) throw new Error('Forbidden');
 const {data:result,error}=await context.supabase.rpc('admin_dispatch_directory',{_filters:data});
 if(error)throw new Error('Dispatch records unavailable');
 return result as unknown as {rows:Record<string,any>[];total:number;metrics:Record<string,number>;as_of:string};
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
export const setDispatchPriority = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(input=>prioritySchema.parse(input)).handler(async({data,context})=>{
 const {data:allowed,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
 if(roleError||!allowed)throw new Error('Forbidden');
 const {data:result,error}=await context.supabase.rpc('admin_dispatch_priority',{_kind:data.kind,_id:data.id,_expected:data.expected,_key:data.key,_priority:data.priority,_reason:data.reason});
 if(error)throw new Error(error.message);return result;
});
export const batchDispatchActions = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(input=>batchSchema.parse(input)).handler(async({data,context})=>{
 const {data:allowed,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
 if(roleError||!allowed)throw new Error('Forbidden');
 const results:{id:string;kind:string;ok:boolean;error?:string}[]=[];
 for(const job of data.jobs){
  try{
   const result=data.action==='priority'&&data.priority
    ? await context.supabase.rpc('admin_dispatch_priority',{_kind:job.kind,_id:job.id,_expected:job.expected,_key:job.key,_priority:data.priority,_reason:data.reason})
    : await context.supabase.rpc('admin_dispatch_action',{_kind:job.kind,_id:job.id,_expected:job.expected,_key:job.key,_action:data.action,_reason:data.reason});
   if(result.error)throw new Error(result.error.message);
   results.push({id:job.id,kind:job.kind,ok:true});
  }catch(error){results.push({id:job.id,kind:job.kind,ok:false,error:error instanceof Error?error.message:'Job action failed'});}
 }
 return {results};
});
export const getDispatchEvidence = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(input=>z.object({id:z.string().uuid()}).parse(input)).handler(async({data,context})=>{
 const {data:allowed,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
 if(roleError||!allowed)throw new Error('Forbidden');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {data:job,error}=await supabaseAdmin.from('deliveries').select('driver_id,proof_photo_url,delivered_at,status').eq('id',data.id).single();
 if(error||!job)throw new Error('Delivery unavailable');
 const path=job.proof_photo_url;
 if(!path)return {url:null,deliveredAt:job.delivered_at,status:job.status};
 const { isDeliveryProofPath } = await import('./delivery-proof');
 if(!job.driver_id||!isDeliveryProofPath(path,job.driver_id,data.id))throw new Error('Evidence ownership cannot be verified');
 const {data:signed,error:signError}=await supabaseAdmin.storage.from('job-photos').createSignedUrl(path,300);
 if(signError)throw new Error('Delivery evidence unavailable');
 return {url:signed.signedUrl,deliveredAt:job.delivered_at,status:job.status};
});
