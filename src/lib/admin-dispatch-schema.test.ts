import { describe, it, expect } from 'vitest';
import { controlSchema, dispatchFilters, batchSchema, prioritySchema } from './admin-dispatch-schema';
describe('dispatch controls',()=>{
 it('requires a recorded reason for privileged actions',()=>{expect(controlSchema.safeParse({kind:'booking',id:'11111111-1111-4111-8111-111111111111',expected:'2026-11-09T11:27:00Z',key:'11111111-1111-4111-8111-111111111112',action:'cancel',reason:''}).success).toBe(false);});
 it('never accepts payment or completion overrides',()=>{expect(controlSchema.safeParse({kind:'delivery',id:'11111111-1111-4111-8111-111111111111',expected:'2026-11-09T11:27:00Z',key:'11111111-1111-4111-8111-111111111112',action:'mark_paid',reason:'Admin reason'}).success).toBe(false);});
 it('bounds pagination to non-negative pages',()=>{expect(dispatchFilters.safeParse({page:-1}).success).toBe(false);});
 const job={kind:'booking',id:'11111111-1111-4111-8111-111111111111',expected:'2026-11-12T20:00:00Z',key:'11111111-1111-4111-8111-111111111112'};
 it('rejects duplicate jobs in a batch',()=>{expect(batchSchema.safeParse({jobs:[job,job],action:'hold',reason:'Operational hold'}).success).toBe(false);});
 it('bounds a batch to one page of 25 jobs',()=>{expect(batchSchema.safeParse({jobs:Array.from({length:26},(_,i)=>({...job,id:`11111111-1111-4111-8111-${String(i).padStart(12,'0')}`})),action:'hold',reason:'Operational hold'}).success).toBe(false);});
 it('requires a reason for priority changes',()=>{expect(prioritySchema.safeParse({...job,priority:'urgent',reason:''}).success).toBe(false);});
 it('rejects unsupported priorities',()=>{expect(prioritySchema.safeParse({...job,priority:'critical',reason:'Operational hold'}).success).toBe(false);});
 it('preserves filters between board presentations',()=>{expect(dispatchFilters.parse({layout:'kanban',priority:'urgent',scheduledFrom:'2026-11-12'})).toMatchObject({layout:'kanban',priority:'urgent',scheduledFrom:'2026-11-12'});});
});