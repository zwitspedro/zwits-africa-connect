import { describe, it, expect } from 'vitest';
import { controlSchema, dispatchFilters } from './admin-dispatch-schema';
describe('dispatch controls',()=>{
 it('requires a recorded reason for privileged actions',()=>{expect(controlSchema.safeParse({kind:'booking',id:'11111111-1111-4111-8111-111111111111',expected:'2026-11-09T11:27:00Z',key:'11111111-1111-4111-8111-111111111112',action:'cancel',reason:''}).success).toBe(false);});
 it('never accepts payment or completion overrides',()=>{expect(controlSchema.safeParse({kind:'delivery',id:'11111111-1111-4111-8111-111111111111',expected:'2026-11-09T11:27:00Z',key:'11111111-1111-4111-8111-111111111112',action:'mark_paid',reason:'Admin reason'}).success).toBe(false);});
 it('bounds pagination to non-negative pages',()=>{expect(dispatchFilters.safeParse({page:-1}).success).toBe(false);});
});