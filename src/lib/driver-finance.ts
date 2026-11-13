export type DriverLedger = { id: string; type: string; amount: number; reference: string; status: string; created_at: string; delivery_id: string | null; withdrawal_id: string | null; balance_after: number; note: string | null };
export type DriverFinancialJob = { id: string; status: string; payment_status: string; payment_method: string | null };
export type DriverWithdrawal = { id: string; amount: number; status: string; method: string; destination: string; created_at: string; processed_at: string | null; failure_reason: string | null };
export type DriverWallet = { available_balance: number; pending_balance: number; lifetime_earnings: number; currency: string };

// Harare is UTC+2 year-round. Week keys are ISO dates, not ambiguous display labels.
export function harareDay(timestamp: string) {
  return new Date(Date.parse(timestamp) + 2 * 3600000).toISOString().slice(0, 10);
}
export function harareWeek(timestamp: string) {
  const day = new Date(harareDay(timestamp) + 'T00:00:00Z');
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  return day.toISOString().slice(0, 10);
}
const cents = (value: number) => Math.round(Number(value) * 100);
export function summarizeDriverFinance(ledger: DriverLedger[], jobs: DriverFinancialJob[], withdrawals: DriverWithdrawal[], wallet: DriverWallet, now = new Date().toISOString()) {
  const posted = ledger.filter(t => t.status === 'posted');
  const byJob = new Map<string, DriverLedger[]>();
  for (const t of posted) if (t.delivery_id) byJob.set(t.delivery_id, [...(byJob.get(t.delivery_id) ?? []), t]);
  const settlements = jobs.flatMap(job => {
    const rows = byJob.get(job.id) ?? [];
    const earning = rows.filter(t => t.type === 'job_earning' && t.reference === `delivery:${job.id}:earning`);
    const fee = rows.filter(t => t.type === 'commission' && t.reference === `delivery:${job.id}:commission`);
    const held = rows.filter(t => t.type === 'adjustment' && t.reference === `delivery:${job.id}:cash_held`);
    const direct = ['cash', 'direct_ecocash', 'direct_bank'].includes(job.payment_method ?? '');
    if (job.status !== 'delivered' || job.payment_status !== 'paid' || earning.length !== 1 || fee.length !== 1 || (direct ? held.length !== 1 : held.length !== 0)) return [];
    const e = earning[0], c = fee[0], h = held[0];
    if (!e || !c || cents(e.amount) <= 0 || cents(c.amount) > 0 || (direct && (!h || cents(h.amount) !== -cents(e.amount)))) return [];
    const gross = cents(e.amount), commission = -cents(c.amount), heldAmount = h ? -cents(h.amount) : 0;
    return [{ id: job.id, recorded_at: e.created_at, reference: e.reference, gross: gross / 100, commission: commission / 100, cash: job.payment_method === 'cash' ? heldAmount / 100 : 0, direct: job.payment_method !== 'cash' ? heldAmount / 100 : 0, net: (gross - commission) / 100, wallet_movement: (gross - commission - heldAmount) / 100 }];
  });
  const total = (rows: typeof settlements, key: 'gross' | 'commission' | 'cash' | 'direct' | 'net' | 'wallet_movement') => rows.reduce((sum, row) => sum + cents(row[key]), 0) / 100;
  const weeks = [...new Set(settlements.map(s => harareWeek(s.recorded_at)))].sort().map(week => {
    const rows = settlements.filter(s => harareWeek(s.recorded_at) === week);
    return { week, gross: total(rows, 'gross'), commission: total(rows, 'commission'), cash: total(rows, 'cash'), direct: total(rows, 'direct'), net: total(rows, 'net'), wallet_movement: total(rows, 'wallet_movement') };
  });
  const withdrawalTotal = (statuses: string[]) => withdrawals.filter(w => statuses.includes(w.status)).reduce((sum, w) => sum + cents(w.amount), 0) / 100;
  const reversals = posted.filter(t => t.type === 'refund' && t.withdrawal_id && t.reference === `withdrawal:${t.withdrawal_id}:reversal`).reduce((sum, t) => sum + cents(t.amount), 0) / 100;
  return { settlements, weeks, gross: total(settlements, 'gross'), commission: total(settlements, 'commission'), cash: total(settlements, 'cash'), direct: total(settlements, 'direct'), net: total(settlements, 'net'), wallet_movement: total(settlements, 'wallet_movement'), today_net: total(settlements.filter(s => harareDay(s.recorded_at) === harareDay(now)), 'net'), withdrawable: Math.max(0, Number(wallet.available_balance)), commission_owed: Math.max(0, -Number(wallet.available_balance)), pending_requests: withdrawalTotal(['requested', 'processing']), recorded_paid: withdrawalTotal(['paid']), failed_requests: withdrawalTotal(['failed', 'cancelled']), reversals, unrecorded_completed: jobs.filter(j => j.status === 'delivered' && !settlements.some(s => s.id === j.id)).length };
}