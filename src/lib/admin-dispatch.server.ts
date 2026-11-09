import { z } from 'zod';
import type { JobKind } from './admin-dispatch-schema';
import { haversineKm, quotePrice } from './delivery-config';
async function db(){const {supabaseAdmin}=await import('@/integrations/supabase/client.server');return supabaseAdmin;}
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
