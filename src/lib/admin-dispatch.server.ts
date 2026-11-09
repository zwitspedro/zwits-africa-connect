import { z } from 'zod';
import type { DispatchFilters, JobKind } from './admin-dispatch-schema';
import { haversineKm, quotePrice } from './delivery-config';
async function db(){const {supabaseAdmin}=await import('@/integrations/supabase/client.server');return supabaseAdmin;}
export async function readDispatchJobs(f:DispatchFilters){
 const client=await db();
 const clean=(s:string)=>s.replace(/[%_,"()\\]/g,' ').trim();
 const term=clean(f.term),customer=clean(f.customer),assignee=clean(f.assignee);
 const uuid=(s:string)=>z.string().uuid().safeParse(s).success;
 const resolve=async(table:'profiles'|'providers'|'driver_profiles',field:string,text:string,idField:string)=>{
  const {data,error}=await (client as any).from(table).select(idField).ilike(field,`%${text}%`).limit(100);if(error)throw new Error('Name search unavailable');return (data??[]).map((r:any)=>r[idField]);
 };
 const customers=customer?(uuid(customer)?[customer]:await resolve('profiles','display_name',customer,'user_id')):null;
 const providers=assignee?(uuid(assignee)?[assignee]:await resolve('providers','business_name',assignee,'id')):null;
 const drivers=assignee?(uuid(assignee)?[assignee]:await resolve('driver_profiles','full_name',assignee,'user_id')):null;
 const {data:control,error:ce}=await client.from('admin_job_controls').select('kind,job_id,held,manual_dispatch').or('held.eq.true,manual_dispatch.eq.true').limit(1000);
 const {data:changes,error:pe}=await client.from('admin_job_changes').select('kind,job_id').in('status',['pending_customer','pending_assignee']).limit(1000);
 if(ce||pe)throw new Error('Job controls unavailable');
 const start=f.page*25;
 const query=async(kind:JobKind)=>{
  if(f.kind!=='all'&&f.kind!==kind)return {rows:[],total:0};
  const booking=kind==='booking',table=booking?'bookings':'deliveries',category=booking?'category':'service_tier',who=booking?'provider_id':'driver_id';
  let q=(client as any).from(table).select(booking?'id,customer_id,provider_id,category,address,description,status,price,payment_status,dispatch_state,scheduled_for,created_at,updated_at':'id,customer_id,driver_id,service_tier,pickup_address,dropoff_address,status,price,payment_status,dispatch_state,created_at,updated_at',{count:'exact'}).order('created_at',{ascending:false}).order('id',{ascending:false});
  const pre=['pending','matching','offered'],active=booking?['accepted','travelling','provider_arriving','arrived','in_progress']:['accepted','arriving','picked_up'];
  if(f.view==='unassigned')q=q.is(who,null).in('status',pre);
  if(f.view==='awaiting_acceptance')q=q.in('status',pre).not('dispatch_state','in','(no_drivers,no_providers,idle)');
  if(f.view==='assigned')q=q.not(who,'is',null).in('status',[...pre,...active]);
  if(f.view==='accepted')q=q.eq('status','accepted');
  if(f.view==='awaiting_collection')q=q.in('status',booking?['accepted','travelling','provider_arriving','arrived']:['accepted','arriving']);
  if(f.view==='in_transit')q=q.in('status',booking?['travelling','provider_arriving','in_progress']:['picked_up']);
  if(f.view==='completed')q=q.eq('status',booking?'completed':'delivered');
  if(f.view==='cancelled')q=q.eq('status','cancelled');
  if(f.view==='failed')q=q.or('status.eq.failed,dispatch_state.in.(no_drivers,no_providers)');
  if(f.view==='intervention'){
   const ids=[...(control??[]).filter(c=>c.kind===kind&&c.held).map(c=>c.job_id),...(changes??[]).filter(c=>c.kind===kind).map(c=>c.job_id)];
   q=q.or(`status.eq.disputed,dispatch_state.in.(no_drivers,no_providers)${ids.length?`,id.in.(${ids.join(',')})`:''}`);
  }
  if(f.category)q=q.ilike(category,`%${clean(f.category)}%`);
  if(customers)q=q.in('customer_id',customers.length?customers:['00000000-0000-0000-0000-000000000000']);
  const assigned=booking?providers:drivers;if(assigned)q=q.in(who,assigned.length?assigned:['00000000-0000-0000-0000-000000000000']);
  if(term)q=uuid(term)?q.eq('id',term):q.or(`${category}.ilike.%${term}%,${booking?'address':'pickup_address'}.ilike.%${term}%${booking?',description.ilike.%'+term+'%':',dropoff_address.ilike.%'+term+'%'}`);
  if(f.from&&/^\d{4}-\d{2}-\d{2}$/.test(f.from))q=q.gte('created_at',`${f.from}T00:00:00+02:00`);
  if(f.to&&/^\d{4}-\d{2}-\d{2}$/.test(f.to)){const until=new Date(`${f.to}T00:00:00+02:00`);until.setUTCDate(until.getUTCDate()+1);q=q.lt('created_at',until.toISOString());}
  const {data,error,count}=await q.range(0,start+24);if(error)throw new Error('Dispatch records unavailable');
  return {rows:(data??[]).map((r:any)=>({...r,kind,held:control?.some(c=>c.kind===kind&&c.job_id===r.id&&c.held),pendingChange:changes?.some(c=>c.kind===kind&&c.job_id===r.id)})),total:count??0};
 };
 const [bookings,deliveries]=await Promise.all([query('booking'),query('delivery')]);
 const all=[...bookings.rows,...deliveries.rows].sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id));
 const rows=all.slice(start,start+25);
 const customerIds=[...new Set(rows.map(r=>r.customer_id))],providerIds=rows.filter(r=>r.kind==='booking'&&r.provider_id).map(r=>r.provider_id),driverIds=rows.filter(r=>r.kind==='delivery'&&r.driver_id).map(r=>r.driver_id);
 const [names,ps,ds]=await Promise.all([client.from('profiles').select('user_id,display_name').in('user_id',customerIds),client.from('providers').select('id,business_name').in('id',providerIds),client.from('driver_profiles').select('user_id,full_name').in('user_id',driverIds)]);
 if(names.error||ps.error||ds.error)throw new Error('Job names unavailable');
 return {rows:rows.map(r=>({...r,customerName:names.data?.find(p=>p.user_id===r.customer_id)?.display_name??'Customer',assigneeName:r.kind==='booking'?ps.data?.find(p=>p.id===r.provider_id)?.business_name:ds.data?.find(p=>p.user_id===r.driver_id)?.full_name})),total:bookings.total+deliveries.total};
}
export async function readDispatchJob(kind:JobKind,id:string){
 const client=await db(),booking=kind==='booking';
 const {data:row,error}=await client.from(booking?'bookings':'deliveries').select('*').eq('id',id).single();if(error||!row)throw new Error('Job unavailable');
 const r=row as Record<string,any>;
 const [profile,actions,changes,control,offers,money,location]=await Promise.all([
  client.from('profiles').select('display_name,phone,user_id').eq('user_id',r.customer_id).maybeSingle(),
  client.from('admin_job_actions').select('*').eq('kind',kind).eq('job_id',id).order('created_at',{ascending:false}).limit(100),
  client.from('admin_job_changes').select('*').eq('kind',kind).eq('job_id',id).order('created_at',{ascending:false}).limit(50),
  client.from('admin_job_controls').select('*').eq('kind',kind).eq('job_id',id).maybeSingle(),
  booking?client.from('job_offers').select('*').eq('booking_id',id).order('offered_at',{ascending:false}).limit(100):client.from('delivery_offers').select('*').eq('delivery_id',id).order('offered_at',{ascending:false}).limit(100),
  client.from('wallet_transactions').select('id,type,amount,created_at,note').eq(booking?'booking_id':'delivery_id',id).order('created_at',{ascending:false}).limit(50),
  booking?client.from('provider_locations').select('lat,lng,updated_at,accuracy').eq('booking_id',id).order('updated_at',{ascending:false}).limit(1):Promise.resolve({data:[],error:null}),
 ]);
 if([profile,actions,changes,control,offers,money,location].some(q=>q.error))throw new Error('Job history unavailable');
 let candidates:any[]=[];
 if(booking){
  const {data:ps,error}=await client.from('providers').select('id,user_id,business_name,category,verification_status,available,rating_avg,jobs_completed').eq('category',r.category).eq('verification_status','approved').eq('available',true).limit(100);if(error)throw new Error('Providers unavailable');
  const {data:loads,error:le}=await client.from('bookings').select('provider_id').in('provider_id',(ps??[]).map(p=>p.id)).in('status',['accepted','travelling','provider_arriving','arrived','in_progress']);if(le)throw new Error('Workload unavailable');
  const {data:times,error:te}=await client.rpc('providers_available_at',{_user_ids:(ps??[]).map(p=>p.user_id),_at:r.scheduled_for??new Date().toISOString()});if(te)throw new Error('Availability unavailable');
  candidates=(ps??[]).map(p=>({...p,name:p.business_name,load:loads?.filter(j=>j.provider_id===p.id).length??0,vehicle:'—',eligible:times?.some(t=>t.user_id===p.user_id)})).filter(p=>p.load<3&&p.eligible);
 }else{candidates=(await readDispatchDrivers()).rows.filter(d=>d.available&&d.verification_status==='approved'&&d.load<3&&d.city==='Harare'&&d.hasDocuments&&d.vehicles.some((v:any)=>r.service_tier==='express_bike'||['van','truck'].includes(v.vehicle_type))).map(d=>({...d,id:d.user_id,name:d.full_name,vehicle:d.vehicles.map((v:any)=>v.vehicle_type).join(', ')}));}
 return {row:r,customer:profile.data,actions:actions.data??[],changes:changes.data??[],control:control.data,offers:offers.data??[],money:money.data??[],location:location.data?.[0]??null,candidates};
}
export async function validateDispatchPatch(kind:JobKind,id:string,input:Record<string,unknown>){
 const booking=z.object({address:z.string().trim().min(3).max(300).optional(),description:z.string().max(2000).nullable().optional(),scheduled_for:z.string().datetime({offset:true}).nullable().optional(),price:z.number().min(0).max(100000).optional(),lat:z.number().min(-90).max(90).nullable().optional(),lng:z.number().min(-180).max(180).nullable().optional(),contact_phone:z.string().max(40).optional(),location_notes:z.string().max(1000).optional()}).strict();
 const delivery=z.object({pickup_address:z.string().trim().min(3).max(300).optional(),dropoff_address:z.string().trim().min(3).max(300).optional(),pickup_lat:z.number().min(-90).max(90).nullable().optional(),pickup_lng:z.number().min(-180).max(180).nullable().optional(),dropoff_lat:z.number().min(-90).max(90).nullable().optional(),dropoff_lng:z.number().min(-180).max(180).nullable().optional(),recipient_name:z.string().max(120).optional(),recipient_phone:z.string().max(40).optional(),notes:z.string().max(1000).optional(),location_notes:z.string().max(1000).optional(),parcel_size:z.enum(['small','medium','large']).optional()}).strict();
 if(kind==='booking')return booking.parse(input);
 const patch=delivery.parse(input),client=await db();const {data:r,error}=await client.from('deliveries').select('*').eq('id',id).single();if(error)throw new Error('Job unavailable');
 if(Object.keys(patch).some(k=>['pickup_address','dropoff_address','pickup_lat','pickup_lng','dropoff_lat','dropoff_lng','parcel_size'].includes(k))){
  const merged={...r,...patch};
  if(patch.pickup_address&&patch.pickup_address!==r.pickup_address&&(!('pickup_lat'in patch)||!('pickup_lng'in patch)))throw new Error('Provide corrected pickup coordinates to recalculate the price');
  if(patch.dropoff_address&&patch.dropoff_address!==r.dropoff_address&&(!('dropoff_lat'in patch)||!('dropoff_lng'in patch)))throw new Error('Provide corrected destination coordinates to recalculate the price');
  const distance=haversineKm(merged.pickup_lat!=null&&merged.pickup_lng!=null?{lat:merged.pickup_lat,lng:merged.pickup_lng}:null,merged.dropoff_lat!=null&&merged.dropoff_lng!=null?{lat:merged.dropoff_lat,lng:merged.dropoff_lng}:null);
  return {...patch,distance_km:distance,price:quotePrice(z.enum(['express_bike','standard_van','business_courier']).parse(r.service_tier),merged.parcel_size as 'small'|'medium'|'large',distance)};
 }
 return patch;
}
export async function readDispatchDrivers(id?:string){
 const client=await db();let q=client.from('driver_profiles').select('id,user_id,full_name,phone,city,available,verification_status,rating_avg,deliveries_completed,licence_url,id_document_url,vehicle_doc_url');if(id)q=q.eq('id',id);
 const {data:drivers,error}=await q.order('created_at',{ascending:false}).limit(100);if(error)throw new Error('Drivers unavailable');const ids=(drivers??[]).map(d=>d.user_id);
 const [jobs,vehicles]=await Promise.all([client.from('deliveries').select('id,driver_id,status,created_at,pickup_address,dropoff_address,delivered_at').in('driver_id',ids).order('created_at',{ascending:false}).limit(300),client.from('vehicles').select('user_id,vehicle_type,plate,active').in('user_id',ids).eq('active',true)]);if(jobs.error||vehicles.error)throw new Error('Driver workload unavailable');
 return {rows:(drivers??[]).map(({licence_url,id_document_url,vehicle_doc_url,...d})=>({...d,hasDocuments:!!licence_url&&!!id_document_url,load:(jobs.data??[]).filter(j=>j.driver_id===d.user_id&&['accepted','arriving','picked_up'].includes(j.status)).length,vehicles:vehicles.data?.filter(v=>v.user_id===d.user_id)??[],jobs:jobs.data?.filter(j=>j.driver_id===d.user_id)??[]}))};
}
