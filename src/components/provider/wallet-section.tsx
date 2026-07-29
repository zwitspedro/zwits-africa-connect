import { Wallet, Banknote, Smartphone, ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatCard, EmptyState, SoonBadge } from "./dashboard-kit";
import type { ProviderData } from "./use-provider-data";

export function WalletSection({ data }: { data: ProviderData }) {
  const { earnings, completed, netFor } = data;
  const history = completed
    .filter((j: any) => j.customer_confirmed_at)
    .slice(0, 20)
    .map((j: any) => ({
      id: j.id,
      date: new Date(j.customer_confirmed_at).toLocaleDateString(),
      label: `${j.category} — ${j.address}`,
      amount: netFor(j),
    }));

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Available balance" value={`$${earnings.released.toFixed(2)}`} icon={Wallet} accent="positive" sub="Customer confirmed" />
        <StatCard label="Pending payments" value={`$${earnings.pending.toFixed(2)}`} sub="Awaiting confirmation" accent="gold" />
        <StatCard label="Lifetime payouts" value={`$${earnings.net.toFixed(2)}`} />
      </div>

      <Panel title="Withdraw funds" description="Move your available balance to a payout method." action={<SoonBadge />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <PayoutMethod icon={Banknote} title="Bank account" detail="Not linked yet" />
          <PayoutMethod icon={Smartphone} title="Mobile money (EcoCash / InnBucks)" detail="Not linked yet" />
        </div>
        <button
          onClick={() => toast("Withdrawals open once payout partners go live.")}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground opacity-60"
        >
          <ArrowDownToLine className="size-4" /> Withdraw ${earnings.released.toFixed(2)}
        </button>
      </Panel>

      <Panel title="Withdrawal & release history">
        {history.length === 0 ? (
          <EmptyState title="No released payments yet." />
        ) : (
          <ul className="grid gap-2">
            {history.map((h) => (
              <li key={h.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate capitalize">{h.label}</div>
                  <div className="text-[11px] text-muted-foreground">{h.date} · released to wallet</div>
                </div>
                <span className="font-semibold tabular-nums text-emerald-400">+${h.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function PayoutMethod({ icon: Icon, title, detail }: { icon: any; title: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="text-[11px] text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}
