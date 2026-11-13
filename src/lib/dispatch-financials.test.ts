import {describe,it,expect} from 'vitest';
import {withdrawalReconciles,financialPeriodSchema} from './dispatch-financials';
describe('withdrawal ledger reconciliation',()=>{
 it('requires requested funds to match their debit',()=>{expect(withdrawalReconciles({amount:25,status:'requested',ledger_debit:-25,ledger_reversal:0})).toBe(true);expect(withdrawalReconciles({amount:25,status:'requested',ledger_debit:-20,ledger_reversal:0})).toBe(false);});
 it('requires completed withdrawals to retain their debit',()=>{expect(withdrawalReconciles({amount:25,status:'paid',ledger_debit:-25,ledger_reversal:0})).toBe(true);expect(withdrawalReconciles({amount:25,status:'paid',ledger_debit:-25,ledger_reversal:25})).toBe(false);});
 it('requires failed withdrawals to restore reserved funds exactly once',()=>{expect(withdrawalReconciles({amount:25,status:'failed',ledger_debit:-25,ledger_reversal:25})).toBe(true);expect(withdrawalReconciles({amount:25,status:'failed',ledger_debit:-25,ledger_reversal:50})).toBe(false);});
 it('requires cancelled withdrawals to restore reserved funds',()=>{expect(withdrawalReconciles({amount:25,status:'cancelled',ledger_debit:-25,ledger_reversal:0})).toBe(false);});
 it('rejects invalid financial periods',()=>expect(financialPeriodSchema.safeParse({from:'2026-11-13T00:00:00Z',to:'2026-11-12T00:00:00Z'}).success).toBe(false));
});