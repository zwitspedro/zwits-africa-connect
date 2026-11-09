import { z } from 'zod';
export const dispatchFilters = z.object({
  kind: z.enum(['all','booking','delivery']).default('all'),
  view: z.enum(['all','unassigned','awaiting_acceptance','assigned','accepted','awaiting_collection','in_transit','completed','failed','cancelled','intervention']).default('all'),
  term: z.string().trim().max(80).default(''), category: z.string().trim().max(60).default(''),
  customer: z.string().trim().max(80).default(''), assignee: z.string().trim().max(80).default(''),
  from: z.string().default(''), to: z.string().default(''), page: z.coerce.number().int().min(0).max(10000).default(0),
});
export type DispatchFilters = z.infer<typeof dispatchFilters>;
export type JobKind = 'booking'|'delivery';
export const controlSchema = z.object({kind:z.enum(['booking','delivery']),id:z.string().uuid(),expected:z.string().datetime(),key:z.string().uuid(),action:z.enum(['note','hold','release','cancel','assign','unassign','reopen','propose','withdraw_proposal']),reason:z.string().trim().min(5).max(1000),assignee:z.string().uuid().optional(),patch:z.record(z.string(),z.unknown()).optional()});
export const responseSchema = z.object({id:z.string().uuid(),decision:z.enum(['approve','reject','acknowledge'])});
export const materialBookingFields = ['address','lat','lng','scheduled_for','description','price'];
export const materialDeliveryFields = ['pickup_address','dropoff_address','pickup_lat','pickup_lng','dropoff_lat','dropoff_lng','price','parcel_size'];