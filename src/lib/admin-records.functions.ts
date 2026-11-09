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
  return {row: row as Record<string,any>,events:(events??[]) as Record<string,any>[],payments:(payments??[]) as Record<string,any>[],disputes:(disputes??[]) as Record<string,any>[]};
 });

/** Cross-entity discovery uses existing tables with narrow fields and a fixed page budget. */
export const searchAdminRecords = createServerFn({method:'GET'}).middleware([requireSupabaseAuth])
 .inputValidator(input=>z.object({term:z.string().trim().min(2).max(80),page:z.number().int().min(0).max(500).default(0)}).parse(input))
 .handler(async({data,context})=>{
  const {data:allowed,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
  if(roleError||!allowed) throw new Error('Forbidden');
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const db=supabaseAdmin as any;
  const term=data.term.replace(/[%_,"()\\]/g,' ').trim();
  if(term.length<2) return {rows:[],hasMore:false};
  const uuid=z.string().uuid().safeParse(term).success;
  const start=data.page*5;
  const customerQuery=context.supabase.rpc('admin_customer_directory',{_term:term,_page:data.page});
  const queries=[
   db.from('providers').select('id,business_name,category,verification_status,created_at').ilike('business_name',`%${term}%`).order('created_at',{ascending:false}).range(start,start+4),
   db.from('driver_profiles').select('id,full_name,verification_status,created_at').or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`).order('created_at',{ascending:false}).range(start,start+4),
   db.from('bookings').select('id,category,status,created_at').filter(uuid?'id':'category',uuid?'eq':'ilike',uuid?term:`%${term}%`).order('created_at',{ascending:false}).range(start,start+4),
   db.from('deliveries').select('id,service_tier,status,created_at').filter(uuid?'id':'service_tier',uuid?'eq':'ilike',uuid?term:`%${term}%`).order('created_at',{ascending:false}).range(start,start+4),
   db.from('payments').select('id,booking_id,delivery_id,status,created_at').filter(uuid?'id':'external_reference',uuid?'eq':'ilike',uuid?term:`%${term}%`).order('created_at',{ascending:false}).range(start,start+4),
  ];
  const [customers,...results]=await Promise.all([customerQuery,...queries]);
  if(customers.error||results.some(r=>r.error)) throw new Error('Search unavailable. Please retry.');
  type Result={id:string;kind:string;label:string;status:string;created_at:string;relatedId?:string};
  const rows:Result[]=(customers.data?.rows??[]).map((r:any)=>({id:r.user_id,kind:'customer',label:r.display_name||'Customer',status:'registered',created_at:r.created_at}));
  const kinds=['provider','driver','booking','delivery','payment'];
  results.forEach((r,i)=>(r.data??[]).forEach((v:any)=>rows.push({id:v.id,kind:kinds[i],label:v.business_name||v.full_name||v.category||v.service_tier||`Payment ${v.id.slice(0,8)}`,status:v.status||v.verification_status,created_at:v.created_at,relatedId:v.booking_id||v.delivery_id})));
  return {rows,hasMore:results.some(r=>r.data?.length===5)||((data.page+1)*25<(customers.data?.total??0))};
 });

/** Small operational previews; no payment destinations, private documents or audit metadata. */
export const getAdminActivity = createServerFn({method:'GET'}).middleware([requireSupabaseAuth])
 .handler(async({context})=>{
  const {data:allowed,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
  if(roleError||!allowed) throw new Error('Forbidden');
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const db=supabaseAdmin as any;
  const definitions=[
   ['booking','bookings','id,category,status,created_at,customer_id,provider_id'],
   ['delivery','deliveries','id,service_tier,status,created_at,customer_id,driver_id'],
   ['provider','providers','id,business_name,verification_status,created_at,user_id'],
   ['withdrawal','provider_withdrawals','id,status,created_at,provider_user_id'],
   ['dispute','disputes','id,status,created_at,customer_id'],
   ['payment','payments','id,status,created_at,customer_id'],
   ['audit','admin_audit_log','id,action,subject_type,subject_id,actor,created_at'],
  ];
  const results=await Promise.all(definitions.map(([,table,fields])=>db.from(table).select(fields).order('created_at',{ascending:false}).limit(5)));
  if(results.some(r=>r.error)) throw new Error('Recent activity unavailable. Please retry.');
  const ids=[...new Set(results.flatMap(r=>(r.data??[]).flatMap((v:any)=>[v.customer_id,v.provider_user_id,v.user_id,v.actor].filter(Boolean))))];
  const names:Record<string,string>={};
  if(ids.length){const {data:profiles,error}=await db.from('profiles').select('user_id,display_name').in('user_id',ids);if(error)throw new Error('Activity names unavailable');for(const p of profiles??[])names[p.user_id]=p.display_name||'Account';}
  const rows=results.flatMap((r,i)=>(r.data??[]).map((v:any)=>({id:v.id,kind:definitions[i][0],label:v.business_name||v.category||v.service_tier||v.action||definitions[i][0],status:v.status||v.verification_status||'recorded',created_at:v.created_at,actor:names[v.actor||v.customer_id||v.provider_user_id||v.user_id]||'—'})));
  return rows.sort((a:any,b:any)=>b.created_at.localeCompare(a.created_at)).slice(0,20) as {id:string;kind:string;label:string;status:string;created_at:string;actor:string}[];
 });
