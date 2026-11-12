import {describe,it,expect} from 'vitest';
import {durationSchema,insightsSchema} from './dispatch-insights-schema';
const base={id:'00000000-0000-4000-8000-000000000001',expected:'2026-11-12T21:00:00Z',minutes:45,basis:'Customer agreed 45-minute commitment',reason:'Record confirmed planning window'};
describe('Supported delivery timing',()=>{
 it('requires the recorded duration source',()=>expect(durationSchema.safeParse({...base,basis:''}).success).toBe(false));
 it('retains an explicit 45-minute commitment',()=>expect(durationSchema.parse(base).minutes).toBe(45));
 it('rejects zero duration',()=>expect(durationSchema.safeParse({...base,minutes:0}).success).toBe(false));
 it('rejects reversed calendar periods',()=>expect(insightsSchema.safeParse({from:'2026-11-13T00:00:00Z',to:'2026-11-12T00:00:00Z'}).success).toBe(false));
});