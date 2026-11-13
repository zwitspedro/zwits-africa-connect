import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { summarizeDriverFinance, type DriverLedger, type DriverFinancialJob, type DriverWithdrawal, type DriverWallet } from './driver-finance';

export const getMyDriverFinance = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = context.supabase;
  // Page through authoritative records: never compute totals from a truncated recent-history list.
  async function readAll<T>(table: 'wallet_transactions' | 'deliveries' | 'provider_withdrawals', columns: string, owner: string): Promise<T[]> {
    const rows: T[] = [];
    for (let from = 0; ; from += 500) {
      const { data, error } = await db.from(table).select(columns).eq(owner, context.userId).order('id').range(from, from + 499);
      if (error) throw new Error('Driver financial records unavailable');
      const page = (data ?? []) as unknown as T[];
      rows.push(...page);
      if (page.length < 500) return rows;
    }
  }
  const [ledger, jobs, withdrawals, walletResult] = await Promise.all([
    readAll<DriverLedger>('wallet_transactions', 'id,type,amount,reference,status,created_at,delivery_id,withdrawal_id,balance_after,note', 'provider_user_id'),
    readAll<DriverFinancialJob>('deliveries', 'id,status,payment_status,payment_method', 'driver_id'),
    readAll<DriverWithdrawal>('provider_withdrawals', 'id,amount,status,method,destination,created_at,processed_at,failure_reason', 'provider_user_id'),
    db.from('provider_wallets').select('available_balance,pending_balance,lifetime_earnings,currency').eq('provider_user_id', context.userId).maybeSingle(),
  ]);
  if (walletResult.error) throw new Error('Driver wallet unavailable');
  const wallet: DriverWallet = walletResult.data ?? { available_balance: 0, pending_balance: 0, lifetime_earnings: 0, currency: 'USD' };
  ledger.sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
  withdrawals.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { wallet, ledger, withdrawals, summary: summarizeDriverFinance(ledger, jobs, withdrawals, wallet), as_of: new Date().toISOString() };
});