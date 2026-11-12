import {describe,it,expect} from 'vitest';
import {isDispatchDriverApproved} from './delivery-eligibility';
describe('delivery dispatch eligibility',()=>{
 it('requires approved verification',()=>{expect(isDispatchDriverApproved('pending',true)).toBe(false);expect(isDispatchDriverApproved('unverified',true)).toBe(false);expect(isDispatchDriverApproved('revoked',true)).toBe(false);});
 it('requires an online approved driver',()=>{expect(isDispatchDriverApproved('approved',false)).toBe(false);expect(isDispatchDriverApproved('approved',true)).toBe(true);});
});