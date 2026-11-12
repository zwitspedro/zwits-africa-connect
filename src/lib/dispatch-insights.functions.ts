import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {durationSchema,insightsSchema,type Insights} from './dispatch-insights-schema';
export const dispatchInsights=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(v=>insightsSchema.parse(v)).handler(async({data,context})=>{
 const {data:r,error}=await context.supabase.rpc('admin_dispatch_insights',{_from:data.from,_to:data.to,_driver:data.driver});if(error)throw new Error(error.message);return r as unknown as Insights;
});
export const recordDuration=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(v=>durationSchema.parse(v)).handler(async({data,context})=>{
 const {error}=await context.supabase.rpc('admin_record_delivery_duration',{_id:data.id,_expected:data.expected,_minutes:data.minutes,_basis:data.basis,_reason:data.reason});if(error)throw new Error(error.message);return {ok:true};
});
export const deliveryAlternatives=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(v=>z.object({id:z.string().uuid(),assignee:z.string().uuid()}).parse(v)).handler(async({data,context})=>{
 const {data:r,error}=await context.supabase.rpc('admin_delivery_alternatives',{_id:data.id,_assignee:data.assignee});if(error)throw new Error(error.message);return r as unknown as {slots:{start:string;end:string}[];limitation:string};
});