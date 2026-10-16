import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const AdminListSchema = z.object({
  kind: z.enum(['bookings','deliveries','drivers','wallets','business','catalogue']),
  page: z.number().int().min(0).max(10000).default(0),
  term: z.string().trim().max(80).default(''), status: z.string().max(40).default('all'),
  from: z.string().datetime().optional(), to: z.string().datetime().optional(),
});
export const listAdminRecords = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth])
 .inputValidator((input) => AdminListSchema.parse(input))
 .handler(async ({data, context}) => {
  const {data: allowed, error: roleError} = await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
  if (roleError || !allowed) throw new Error('Forbidden');
  const {supabaseAdmin} = await import('@/integrations/supabase/client.server');
  const db = supabaseAdmin as any;
  const tables = {bookings:'bookings',deliveries:'deliveries',drivers:'driver_profiles',wallets:'provider_wallets',business:'profiles',catalogue:'services'};
  const columns = {
   bookings:'id,customer_id,provider_id,category,status,price,payment_status,dispatch_state,created_at,updated_at',
   deliveries:'id,customer_id,driver_id,service_tier,status,price,payment_status,dispatch_state,created_at,updated_at',
   drivers:'id,user_id,full_name,city,available,verification_status,deliveries_completed,rating_avg,updated_at,created_at',
   wallets:'provider_user_id,available_balance,pending_balance,lifetime_earnings,currency,updated_at,created_at',
   business:'user_id,display_name,city,created_at,updated_at',
   catalogue:'id,slug,name,description,active,created_at,updated_at',
  };
  let q = db.from(tables[data.kind]).select(columns[data.kind],{count:'exact'}).order('created_at',{ascending:false});
  if (data.kind==='business') {
    // A relational role filter avoids user-editable profile account_type.
    q = db.from('user_roles').select('id,user_id,created_at',{count:'exact'}).eq('role','business').order('created_at',{ascending:false});
  }
  if (data.status!=='all') {
    if (data.kind==='bookings'||data.kind==='deliveries') q=q.eq('status',data.status);
    if (data.kind==='drivers') q=data.status==='online'?q.eq('available',true).eq('verification_status','approved'):q.eq('verification_status',data.status);
    if (data.kind==='catalogue') q=q.eq('active',data.status==='active');
    if (data.kind==='wallets') q=data.status==='debt'?q.lt('available_balance',0):q.gt('available_balance',0);
  }
  if(data.from) q=q.gte('created_at',data.from);
  if(data.to) q=q.lt('created_at',data.to);
  const term=data.term.replace(/[%_,"()\\]/g,' ').trim();
  if(term) {
    if(data.kind==='bookings'||data.kind==='deliveries') {
      if(z.string().uuid().safeParse(term).success) q=q.or(`id.eq.${term},customer_id.eq.${term},${data.kind==='bookings'?'provider_id':'driver_id'}.eq.${term}`);
      else q=q.ilike(data.kind==='bookings'?'category':'service_tier',`%${term}%`);
    }
    if(data.kind==='drivers') q=q.ilike('full_name',`%${term}%`);
    if(data.kind==='catalogue') q=q.or(`name.ilike.%${term}%,slug.ilike.%${term}%`);
    if(data.kind==='wallets' && z.string().uuid().safeParse(term).success) q=q.eq('provider_user_id',term);
  }
  const {data:rows,count,error}=await q.range(data.page*25,data.page*25+24);
  if(error) throw new Error('Unable to load records. Please retry.');
  let records=rows??[];
  if(data.kind==='business' && records.length) {
   const {data:profiles,error:e}=await db.from('profiles').select('user_id,display_name,city').in('user_id',records.map((r:any)=>r.user_id));
   if(e) throw new Error('Unable to load business profiles');
   records=records.map((r:any)=>({...r,...profiles?.find((p:any)=>p.user_id===r.user_id)}));
  }
  if(data.kind==='wallets' && records.length) {
    const {data: providers, error:e}=await db.from('providers').select('id,user_id,business_name').in('user_id',records.map((r:any)=>r.provider_user_id));
    if(e) throw new Error('Unable to load wallet owners');
    records=records.map((r:any)=>({...r,provider_id:providers?.find((p:any)=>p.user_id===r.provider_user_id)?.id}));
  }
  return {rows:records as Record<string, any>[],total:count??0};
 });
export const getAdminRecord = createServerFn({method:'GET'}).middleware([requireSupabaseAuth])
 .inputValidator((input)=>z.object({kind:z.enum(['booking','delivery']),id:z.string().uuid()}).parse(input))
 .handler(async({data,context})=>{
  const {data:allowed,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
  if(roleError||!allowed) throw new Error('Forbidden');
  const {supabaseAdmin} = await import('@/integrations/supabase/client.server');
  const db=supabaseAdmin as any;
  const {data:row,error}=await db.from(data.kind==='booking'?'bookings':'deliveries').select('*').eq('id',data.id).maybeSingle();
  if(error||!row) {console.error('Admin record unavailable',error);throw new Error('Record unavailable');}
  const eventsResult = data.kind === 'booking'
    ? await db.from('booking_status_history').select('*').eq('booking_id', data.id).order('created_at',{ascending:true}).limit(200)
    : await db.from('delivery_events').select('*').eq('delivery_id', data.id).order('created_at',{ascending:true}).limit(200);
  const {data:events,error:eventError}=eventsResult;
  const {data:payments,error:paymentError}=await db.from('payments').select('id,amount,currency,status,payment_method,paid_at,failure_reason').eq(data.kind==='booking'?'booking_id':'delivery_id',data.id).limit(25);
  const {data:disputes,error:disputeError}=await db.from('disputes').select('id,status,reason,resolution,created_at').eq(data.kind==='booking'?'booking_id':'delivery_id',data.id).limit(25);
  if(eventError||paymentError||disputeError) {console.error("Admin history query failed",eventError, paymentError,disputeError);throw new Error('Record history unavailable');}
  return {row,events:events??[],payments:payments??[],disputes:disputes??[]};
 });
