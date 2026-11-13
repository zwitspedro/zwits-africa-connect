import { describe, expect, it } from 'vitest';
import { summarizeDriverFinance, harareWeek, type DriverLedger } from './driver-finance';
const wallet = { available_balance: -2.5, pending_balance: 0, lifetime_earnings: 25, currency: 'USD' };
const job = { id: 'a', status: 'delivered', payment_status: 'paid', payment_method: 'cash' };
const tx = (type: string, amount: number, suffix: string, time = '2026-11-08T22:30:00Z'): DriverLedger => ({ id: suffix, type, amount, reference: `delivery:a:${suffix}`, status: 'posted', created_at: time, delivery_id: 'a', withdrawal_id: null, balance_after: 0, note: null });
const ledger = [tx('job_earning', 25, 'earning'), tx('commission', -2.5, 'commission'), tx('adjustment', -25, 'cash_held')];
describe('recorded driver finance', () => {
  it('uses stored $2.50 commission and distinguishes $25 cash, $22.50 net and -$2.50 wallet movement', () => {
    const s = summarizeDriverFinance(ledger, [job], [], wallet);
    expect([s.gross, s.commission, s.cash, s.net, s.wallet_movement, s.withdrawable, s.commission_owed]).toEqual([25, 2.5, 25, 22.5, -2.5, 0, 2.5]);
  });
  it('does not replace actual commission with a fixed 10% or 15%', () => expect(summarizeDriverFinance([ledger[0], tx('commission', -4, 'commission'), ledger[2]], [job], [], wallet).net).toBe(21));
  it('excludes unpaid completed jobs', () => expect(summarizeDriverFinance(ledger, [{ ...job, payment_status: 'pending' }], [], wallet).gross).toBe(0));
  it('excludes cancelled jobs', () => expect(summarizeDriverFinance(ledger, [{ ...job, status: 'cancelled' }], [], wallet).gross).toBe(0));
  it('excludes ledger rows that are not posted', () => expect(summarizeDriverFinance(ledger.map(t => ({ ...t, status: 'pending' })), [job], [], wallet).gross).toBe(0));
  it('excludes another job’s financial references', () => expect(summarizeDriverFinance(ledger.map(t => ({ ...t, reference: t.reference.replace('delivery:a:', 'delivery:b:') })), [job], [], wallet).gross).toBe(0));
  it('counts today using receipt record time in Harare, not completed job time', () => {
    expect(summarizeDriverFinance(ledger, [job], [], wallet, '2026-11-08T23:00:00Z').today_net).toBe(22.5);
    expect(summarizeDriverFinance(ledger, [job], [], wallet, '2026-11-09T22:00:00Z').today_net).toBe(0);
  });
  it('keeps platform-collected net wallet credit separate from held cash', () => expect(summarizeDriverFinance(ledger.slice(0, 2), [{ ...job, payment_method: 'card' }], [], { ...wallet, available_balance: 22.5 })).toMatchObject({ wallet_movement: 22.5, cash: 0, withdrawable: 22.5 }));
  it('excludes incomplete cash settlement instead of inventing held funds', () => expect(summarizeDriverFinance(ledger.slice(0, 2), [job], [], wallet).gross).toBe(0));
  it('rejects duplicate earning references', () => expect(summarizeDriverFinance([...ledger, ledger[0]], [job], [], wallet).gross).toBe(0));
  it('preserves one earning on readback/replay', () => expect(summarizeDriverFinance(ledger, [job], [], wallet).settlements).toHaveLength(1));
  it('buckets by settlement timestamp and Harare Monday boundaries', () => {
    expect(harareWeek('2026-11-08T21:59:00Z')).toBe('2026-11-02');
    expect(summarizeDriverFinance(ledger, [job], [], wallet).weeks[0]).toMatchObject({ week: '2026-11-09', gross: 25, commission: 2.5, net: 22.5 });
  });
  it('keeps direct account receipts separate from physical cash', () => expect(summarizeDriverFinance(ledger, [{ ...job, payment_method: 'direct_bank' }], [], wallet)).toMatchObject({ cash: 0, direct: 25, withdrawable: 0 }));
  it('shows honest empty history', () => expect(summarizeDriverFinance([], [], [], wallet)).toMatchObject({ weeks: [], settlements: [], gross: 0, recorded_paid: 0 }));
  it('separates pending, recorded paid, failed and posted reversal amounts', () => {
    const requests = ['requested', 'processing', 'paid', 'failed'].map((status, i) => ({ id: String(i), amount: 10, status, method: 'cash', destination: 'private', created_at: '2026-11-09T00:00:00Z', processed_at: null, failure_reason: null }));
    const reversal = { ...tx('refund', 10, 'reversal'), delivery_id: null, withdrawal_id: '3', reference: 'withdrawal:3:reversal' };
    expect(summarizeDriverFinance([reversal], [], requests, wallet)).toMatchObject({ pending_requests: 20, recorded_paid: 10, failed_requests: 10, reversals: 10 });
  });
});