import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getCashReconciliation } from '@/lib/wallet.functions';
import { reconcileCash } from '@/lib/cash-reconciliation';
import { Panel } from './dashboard-kit';
import { Button } from '@/components/ui/button';

export function CashReconciliation() {
  const read=useServerFn(getCashReconciliation), [counted,setCounted]=useState('');
  const q=useQuery({queryKey:['provider-cash-reconciliation'],queryFn:()=>read(),refetchInterval:30000});
  const received=Number(q.data?.cash_received??0), commission=Number(q.data?.cash_commission??0);
  const comparison=reconcileCash(received,commission,counted.trim() && Number.isFinite(Number(counted)) ? Number(counted) : null);
  const money=(n:number)=>`$${n.toFixed(2)}`;
  return <Panel title="Cash reconciliation">
    {q.isPending ? <p>Loading confirmed receipts…</p> : q.isError ? <p role="alert">Cash totals unavailable. <Button variant="outline" onClick={()=>void q.refetch()}>Retry</Button></p> : <>
      <dl className="grid gap-4 text-sm sm:grid-cols-3"><div><dt className="text-muted-foreground">Confirmed cash received · all time</dt><dd className="mt-2 text-xl font-semibold">{money(received)}</dd></div><div><dt className="text-muted-foreground">Commission on cash jobs</dt><dd className="mt-2 text-xl font-semibold">{money(commission)}</dd></div><div><dt className="text-muted-foreground">Cash earnings after commission</dt><dd className="mt-2 text-xl font-semibold">{money(comparison.net)}</dd></div></dl>
      <label className="mt-5 grid gap-2 text-sm">Actual cash in hand (USD)<input type="number" min="0" step="0.01" value={counted} onChange={e=>setCounted(e.target.value)} className="min-h-12 rounded-md border border-input bg-background px-3"/></label>
      {comparison.difference!==null && <p className="mt-3 text-sm" role="status">Cash counted minus recorded receipts: {money(comparison.difference)}.</p>}
      <p className="mt-3 text-xs text-muted-foreground">The count is your own comparison, not a verified receipt or a wallet adjustment. Spending and deposits may explain a difference. Commission shown is owed on these jobs, not proof of repayment. Cash is already held by you and cannot be paid out again.</p>
      <p className="mt-3 text-sm">Confirmed personal transfers: {money(Number(q.data?.direct_received??0))} · Commission: {money(Number(q.data?.direct_commission??0))}. These are not physical cash.</p>
    </>}
  </Panel>;
}