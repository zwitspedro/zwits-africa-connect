import { expect, it } from 'vitest';
import { reconcileCash } from './cash-reconciliation';
it('subtracts commission from received cash without creating a payout', () => {
  expect(reconcileCash(100,10,100)).toEqual({net:90,difference:0});
});
it('compares cash received with actual cash counted', () => {
  expect(reconcileCash(100,10,85).difference).toBe(-15);
  expect(reconcileCash(100,10,null).difference).toBeNull();
});