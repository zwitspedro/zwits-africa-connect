import { useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { Banknote, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, Panel, StatCard } from '@/components/provider/dashboard-kit';
import { confirmDeliveryPayment } from '@/lib/payments.functions';
import { getMyDriverFinance } from '@/lib/driver-finance.functions';
import type { DeliveryRow } from './use-driver-data';

type Finance = Awaited<ReturnType<typeof getMyDriverFinance>>;
const money = (value: number) => `${Number(value) < 0 ? '−' : ''}$${Math.abs(Number(value)).toFixed(2)}`;
const time = (value: string | null) => value ? new Date(value).toLocaleString('en-GB', { timeZone: 'Africa/Harare' }) : 'Not recorded';
function Pager({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  return <div className="flex items-center justify-end gap-3 py-3 text-xs"><span>{total === 0 ? '0 records' : `${page * 12 + 1}–${Math.min((page + 1) * 12, total)} of ${total}`}</span><Button variant="outline" size="icon" className="min-h-12 min-w-12" aria-label="Previous records" disabled={page === 0} onClick={() => onChange(page - 1)}><ChevronLeft /></Button><Button variant="outline" size="icon" className="min-h-12 min-w-12" aria-label="Next records" disabled={(page + 1) * 12 >= total} onClick={() => onChange(page + 1)}><ChevronRight /></Button></div>;
}
export function DriverEarnings({ completed, finance }: { completed: DeliveryRow[]; finance: UseQueryResult<Finance, Error> }) {
  const confirm = useServerFn(confirmDeliveryPayment);
  const qc = useQueryClient();
  const [ledgerPage, setLedgerPage] = useState(0);
  const [withdrawalPage, setWithdrawalPage] = useState(0);
  const [deliveryPage, setDeliveryPage] = useState(0);
  const receipt = useMutation({ mutationFn: (deliveryId: string) => confirm({ data: { deliveryId } }), onSuccess: () => {
    toast.success('Cash receipt recorded');
    for (const key of ['driver-deliveries', 'driver-finance', 'provider-wallet', 'provider-ledger']) void qc.invalidateQueries({ queryKey: [key] });
  }, onError: error => toast.error(error.message) });
  if (!finance.data) return <Panel title="Driver finances">{finance.isError ? <div className="space-y-3"><p className="text-sm text-destructive">Financial records unavailable. No amounts estimated.</p><Button variant="outline" onClick={() => void finance.refetch()}><RefreshCw />Retry</Button></div> : <p role="status" className="text-sm text-muted-foreground">Loading financial records…</p>}</Panel>;
  const { summary: s, wallet, ledger, withdrawals, as_of } = finance.data;
  const metrics = [
    ['Gross delivery earnings', s.gross], ['Commission charged', s.commission], ['Cash already collected', s.cash], ['Net economic earnings', s.net],
    ['Delivery wallet movement', s.wallet_movement], ['Current withdrawable balance', s.withdrawable], ['Pending withdrawal requests', s.pending_requests],
    ['Recorded paid withdrawals', s.recorded_paid], ['Failed / cancelled requests', s.failed_requests], ['Posted withdrawal reversals', s.reversals],
    ['Personal transfers collected', s.direct], ['Lifetime wallet gross', Number(wallet.lifetime_earnings)], ['Current wallet balance', Number(wallet.available_balance)], ['Pending wallet clearance', Number(wallet.pending_balance)],
  ] as const;
  return <div className="driver-finance min-w-0 space-y-4">
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3"><div className="min-w-0"><h2 className="font-display text-xl">Driver finances</h2><p className="mt-1 text-xs text-muted-foreground">USD · Recorded {time(as_of)} · Harare time</p></div><Button variant="outline" size="icon" aria-label="Refresh driver finances" className="min-h-12 min-w-12 shrink-0" onClick={() => void finance.refetch()} disabled={finance.isFetching}><RefreshCw className={finance.isFetching ? 'animate-spin' : ''} /></Button></div>
    {finance.isError && <p role="alert" className="text-sm text-destructive">Refresh failed. Previously recorded amounts are shown.</p>}
    <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 xl:grid-cols-3">{metrics.map(([label, value]) => <StatCard key={label} label={label} value={money(value)} />)}</div>
    {s.commission_owed > 0 && <p className="text-sm text-warning">Commission owed: {money(s.commission_owed)}</p>}
    <p className="text-xs text-muted-foreground">Driver-held cash and personal transfers are not withdrawable wallet funds. Outbound payouts remain unavailable; a paid request status alone is not transfer evidence.</p>
    {s.unrecorded_completed > 0 && <p role="status" className="text-sm text-warning">{s.unrecorded_completed} completed {s.unrecorded_completed === 1 ? 'delivery has' : 'deliveries have'} no complete recorded settlement. Excluded from confirmed earnings.</p>}
    <Panel title="Weekly settled earnings" description="Week beginning Monday · Settlement record timestamps, Harare time">
      {!s.weeks.length ? <EmptyState title="No recorded delivery settlements." /> : <ul className="divide-y divide-border">{s.weeks.slice().reverse().map(w => <li key={w.week} className="py-4"><h3 className="font-semibold">{w.week}</h3><dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{[['Gross', w.gross], ['Commission', w.commission], ['Cash collected', w.cash], ['Personal transfers', w.direct], ['Net economic earnings', w.net], ['Wallet movement', w.wallet_movement]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words font-semibold tabular-nums">{money(Number(value))}</dd></div>)}</dl></li>)}</ul>}
    </Panel>
    <Panel title="Completed deliveries" description="Completion and payment receipt are separate records">
      {!completed.length ? <EmptyState title="No completed deliveries." /> : <ul className="divide-y divide-border">{completed.slice(deliveryPage * 12, deliveryPage * 12 + 12).map(d => {
        const settled = s.settlements.find(row => row.id === d.id);
        return <li key={d.id} className="grid min-w-0 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><p className="break-words text-sm font-semibold">{d.dropoff_address}</p><p className="mt-1 text-xs text-muted-foreground">Completed {time(d.delivered_at)} · Payment {d.payment_status}</p><p className="mt-1 break-all text-xs text-muted-foreground">{d.id}</p>{settled ? <><p className="mt-2 text-sm">Gross {money(settled.gross)} · Commission {money(settled.commission)} · Net {money(settled.net)}</p><p className="text-xs">Cash {money(settled.cash)} · Personal transfer {money(settled.direct)} · Wallet movement {money(settled.wallet_movement)}</p><p className="mt-1 break-all text-xs text-muted-foreground">Recorded {time(settled.recorded_at)} · {settled.reference}</p></> : <p className="mt-2 text-sm text-warning">{d.payment_status === 'paid' ? 'Settlement not recorded or incomplete' : 'Payment not confirmed'} · Job value {d.price == null ? 'Not recorded' : money(d.price)}</p>}</div><div className="min-w-0 sm:self-start">{d.payment_method === 'cash' && d.payment_status !== 'paid' && <Button variant="outline" className="min-h-12 w-full whitespace-normal sm:w-auto" disabled={receipt.isPending} onClick={() => { if (window.confirm('Confirm that you personally received the customer’s cash?')) receipt.mutate(d.id); }}><Banknote className="shrink-0" />Confirm cash received</Button>}</div></li>;
      })}</ul>}
      {completed.length > 12 && <Pager page={deliveryPage} total={completed.length} onChange={setDeliveryPage} />}
    </Panel>
    <Panel title="Wallet transactions" description="All wallet activity · Newest first">
      {!ledger.length ? <EmptyState title="No wallet transactions recorded." /> : <ul className="divide-y divide-border">{ledger.slice(ledgerPage * 12, ledgerPage * 12 + 12).map(t => <li key={t.id} className="min-w-0 py-4"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"><p className="min-w-0 break-words text-sm font-semibold capitalize">{t.type.replaceAll('_', ' ')}</p><span className="break-all text-sm font-semibold tabular-nums">{money(t.amount)}</span></div><p className="mt-1 text-xs">{time(t.created_at)} · {t.status} · Balance after {money(t.balance_after)}</p>{t.note && <p className="mt-1 break-words text-xs text-muted-foreground">{t.note}</p>}<p className="mt-1 break-all text-xs text-muted-foreground">Reference: {t.reference}</p>{t.delivery_id && <p className="break-all text-xs">Delivery: {t.delivery_id}</p>}{t.withdrawal_id && <p className="break-all text-xs">Withdrawal: {t.withdrawal_id}</p>}</li>)}</ul>}
      {ledger.length > 12 && <Pager page={ledgerPage} total={ledger.length} onChange={setLedgerPage} />}
    </Panel>
    <Panel title="Withdrawal history">
      {!withdrawals.length ? <EmptyState title="No withdrawal requests or completed payouts recorded." /> : <ul className="divide-y divide-border">{withdrawals.slice(withdrawalPage * 12, withdrawalPage * 12 + 12).map(w => {
        const movements = ledger.filter(t => t.withdrawal_id === w.id);
        return <li key={w.id} className="min-w-0 space-y-1 py-4 text-xs"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm"><span className="min-w-0 break-words capitalize">{w.status} · {w.method.replaceAll('_', ' ')}</span><span className="font-semibold tabular-nums">{money(w.amount)}</span></div><p className="break-words">Destination: {w.destination}</p><p>Requested {time(w.created_at)} · Processed {time(w.processed_at)}</p><p className="break-all">Request: {w.id}</p>{w.failure_reason && <p className="break-words text-destructive">{w.failure_reason}</p>}{movements.map(t => <p key={t.id} className="break-all">{t.type}: {money(t.amount)} · {t.reference} · {time(t.created_at)}</p>)}{!movements.length && <p className="text-warning">No linked ledger movement recorded.</p>}{w.status === 'paid' && <p className="text-warning">External transfer evidence is not available in this record.</p>}</li>;
      })}</ul>}
      {withdrawals.length > 12 && <Pager page={withdrawalPage} total={withdrawals.length} onChange={setWithdrawalPage} />}
    </Panel>
  </div>;
}
