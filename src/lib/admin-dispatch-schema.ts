import { z } from 'zod';
export const dispatchFilters = z.object({
  kind: z.enum(['all','booking','delivery']).default('all'),
  view: z.enum(['all','active','unassigned','awaiting_acceptance','awaiting_driver','awaiting_provider','assigned','accepted','awaiting_collection','in_transit','scheduled','delayed','completed','completed_today','failed','cancelled','intervention']).default('all'),
  layout: z.enum(['list','table','kanban','map','agenda']).default('list'),
  priority: z.enum(['all','low','normal','high','urgent']).default('all'),
  business: z.enum(['all','business']).default('all'),
  scheduledFrom: z.string().default(''), scheduledTo: z.string().default(''),
  term: z.string().trim().max(80).default(''), category: z.string().trim().max(60).default(''),
  customer: z.string().trim().max(80).default(''), assignee: z.string().trim().max(80).default(''),
  from: z.string().default(''), to: z.string().default(''), page: z.coerce.number().int().min(0).max(10000).default(0),
});
export type DispatchFilters = z.infer<typeof dispatchFilters>;
export type JobKind = 'booking'|'delivery';
export const controlSchema = z.object({kind:z.enum(['booking','delivery']),id:z.string().uuid(),expected:z.string().datetime({offset:true}),key:z.string().uuid(),action:z.enum(['note','hold','release','cancel','assign','unassign','reopen','propose','withdraw_proposal']),reason:z.string().trim().min(5).max(1000),assignee:z.string().uuid().optional(),patch:z.record(z.string(),z.unknown()).optional()});
export const responseSchema = z.object({id:z.string().uuid(),decision:z.enum(['approve','reject','acknowledge'])});
export const prioritySchema = z.object({kind:z.enum(['booking','delivery']),id:z.string().uuid(),expected:z.string().datetime({offset:true}),key:z.string().uuid(),priority:z.enum(['low','normal','high','urgent']),reason:z.string().trim().min(5).max(1000)});
export const batchSchema = z.object({jobs:z.array(z.object({kind:z.enum(['booking','delivery']),id:z.string().uuid(),expected:z.string().datetime({offset:true}),key:z.string().uuid()})).min(1).max(25),action:z.enum(['hold','release','priority']),priority:z.enum(['low','normal','high','urgent']).optional(),reason:z.string().trim().min(5).max(1000)}).refine(v=>v.action!=='priority'||!!v.priority,{message:'Priority is required'}).refine(v=>new Set(v.jobs.map(j=>`${j.kind}:${j.id}`)).size===v.jobs.length,{message:'Each job must appear only once'});
export const materialBookingFields = ['address','lat','lng','scheduled_for','description','price'];
export const materialDeliveryFields = ['pickup_address','dropoff_address','pickup_lat','pickup_lng','dropoff_lat','dropoff_lng','price','parcel_size'];