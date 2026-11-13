import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {financialPeriodSchema,type Financials} from './dispatch-financials';
export const dispatchFinancials=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator(v=>financialPeriodSchema.parse(v)).handler(async({data,context})=>{
 const {data:r,error}=await context.supabase.rpc('admin_dispatch_financials',{_from:data.from,_to:data.to,_driver:data.driver,_page:data.page});
 if(error)throw new Error('Financial records unavailable');
 return r as unknown as Financials;
});