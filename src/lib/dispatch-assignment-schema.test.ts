import {describe,it,expect} from 'vitest';
import {bulkAssignmentSchema,replacementSchema} from './dispatch-assignment-schema';
const job={kind:'delivery',id:'11111111-1111-4111-8111-111111111111',assignee:'22222222-2222-4222-8222-222222222222',expected:'2026-11-12T20:00:00Z',key:'33333333-3333-4333-8333-333333333333'};
describe('dispatch assignment controls',()=>{
 it('requires a reason for driver replacement',()=>{expect(replacementSchema.safeParse({id:job.id,replacement:job.assignee,expected:job.expected,key:job.key,reason:''}).success).toBe(false);});
 it('rejects duplicate bulk jobs',()=>{expect(bulkAssignmentSchema.safeParse({jobs:[job,job],reason:'Replace capacity',preview:true}).success).toBe(false);});
 it('accepts different assignees for different jobs',()=>{expect(bulkAssignmentSchema.safeParse({jobs:[job,{...job,id:'44444444-4444-4444-8444-444444444444',assignee:'55555555-5555-4555-8555-555555555555'}],reason:'Assign deliveries',preview:true}).success).toBe(true);});
 it('bounds bulk assignments to 25 jobs',()=>{expect(bulkAssignmentSchema.safeParse({jobs:Array.from({length:26},(_,i)=>({...job,id:`11111111-1111-4111-8111-${String(i).padStart(12,'0')}`})),reason:'Assign deliveries',preview:true}).success).toBe(false);});
});