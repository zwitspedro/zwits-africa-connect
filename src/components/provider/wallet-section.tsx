import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Wallet, ArrowDownToLine, Loader2, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { requestWithdrawal } from "@/lib/wallet.functions";
import { Panel, StatCard, EmptyState } from "./dashboard-kit";
import type { ProviderData } from "./use-provider-data";

const METHODS = [
  { id: "bank_transfer", label: "Bank transfer", hint: "Coming soon", live: false },
  { id: "cash", label: "Cash pickup", hint: "Pickup contact number", live: true },
  { id: "ecocash", label: "EcoCash", hint: "Coming soon", live: false },
  { id: "innbucks", label: "InnBucks", hint: "Coming soon", live: false },
] as const;

type MethodId = (typeof METHODS)[number]["id"];

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;

export function WalletSection({ data }: { data: ProviderData }) {
  const { wallet, walletLoading, walletError, ledger, ledgerLoading, withdrawals } = data;
  const qc = useQueryClient();
  const submitWithdrawal = useServerFn(requestWithdrawal);

  const available = Number(wallet?.available_balance ?? 0);
  const [method, setMethod] = useState<MethodId>("cash");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");

  const pendingRequest = (withdrawals ?? []).find((w: any) =>
    ["requested", "processing"].includes(w.status),
  );

  const withdraw = useMutation({
    mutationFn: async () =>
      submitWithdrawal({
        data: { amount: Number(amount), method, destination: destination.trim() },
      }),
    onSuccess: () => {
      toast.success("Withdrawal requested", {
        description: "Your funds are reserved for review; no payout has been sent.",
      });
      setAmount("");
      setDestination("");
      void qc.invalidateQueries({ queryKey: ["provider-wallet"] });
      void qc.invalidateQueries({ queryKey: ["provider-ledger"] });
      void qc.invalidateQueries({ queryKey: ["provider-withdrawals"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not request withdrawal"),
  });

  const amountNumber = Number(amount);
  const amountValid = amountNumber > 0 && amountNumber <= available;
  const canSubmit =
    !pendingRequest && amountValid && destination.trim().length >= 4 && !withdraw.isPending;

  if (walletError) {
    return (
      <Panel title="Wallet">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4" /> {walletError.message}
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label={available < 0 ? "Balance (commission owed)" : "Available balance"}
          value={walletLoading ? "…" : available < 0 ? `−${money(Math.abs(available))}` : money(available)}
          icon={Wallet}
          accent="positive"
          sub={available > 0 ? "Ready to withdraw" : "Nothing to withdraw yet"}
        />
        <StatCard
          label="Pending clearance"
          value={walletLoading ? "…" : money(Number(wallet?.pending_balance ?? 0))}
          sub="Awaiting confirmation"
          accent="gold"
        />
        <StatCard
          label="Lifetime earnings"
          value={walletLoading ? "…" : money(Number(wallet?.lifetime_earnings ?? 0))}
        />
      </div>

      {available < 0 && (
        <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">
          <div className="font-semibold">Commission owed: {money(Math.abs(available))}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            You keep the cash customers pay you. The 10% Zwits commission on those jobs is recorded
            here. Commission repayment arrangements are not connected yet. Payouts open once your balance is above $0.00.
          </p>
        </div>
      )}

      <Panel
        title="Request a payout"
        description="Only money Zwits holds for you can be paid out. Cash you received from customers is already yours. Requests reserve your funds for review. Settlement remains unavailable until a verified payout process is connected."
      >
        {pendingRequest ? (
          <div className="rounded-2xl border border-border/70 bg-background/40 p-4 text-sm">
            You have a withdrawal of{" "}
            <span className="font-semibold">{money(pendingRequest.amount)}</span> currently{" "}
            <span className="capitalize">{pendingRequest.status}</span>. You can request another
            once it settles.
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) withdraw.mutate();
            }}
            className="grid gap-3"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {METHODS.map((m) => (
                <Button
                  type="button"
                  key={m.id}
                  disabled={!m.live}
                  aria-disabled={!m.live}
                  onClick={() => m.live && setMethod(m.id)}
                  className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    method === m.id
                      ? "border-primary bg-primary/5"
                      : "border-border/70 bg-background/40 hover:bg-muted/40"
                  }`}
                >
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="text-[11px] text-muted-foreground">{m.hint}</div>
                </Button>
              ))}
            </div>

            <label className="grid gap-1.5 text-xs text-muted-foreground">
              Destination
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={METHODS.find((m) => m.id === method)?.hint}
                className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
              />
            </label>

            <label className="grid gap-1.5 text-xs text-muted-foreground">
              Amount (max {money(available)})
              <input
                value={amount}
                inputMode="decimal"
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm tabular-nums text-foreground"
              />
            </label>

            {amount && !amountValid && (
              <p className="text-xs text-destructive">
                Enter an amount between $0.01 and {money(available)}.
              </p>
            )}

            <Button
              disabled={!canSubmit}
              className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {withdraw.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="size-4" />
              )}
              {withdraw.isPending ? "Requesting…" : "Request withdrawal"}
            </Button>
          </form>
        )}
      </Panel>

      <Panel title="Withdrawal requests">
        {(withdrawals ?? []).length === 0 ? (
          <EmptyState title="No withdrawals yet." />
        ) : (
          <ul className="grid gap-2">
            {(withdrawals ?? []).map((w: any) => (
              <li
                key={w.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate capitalize">
                    {String(w.method).replace("_", " ")} — {w.destination}
                  </div>
                  <div className="text-[11px] capitalize text-muted-foreground">
                    {new Date(w.created_at).toLocaleDateString()} · {w.status}
                    {w.failure_reason ? ` · ${w.failure_reason}` : ""}
                  </div>
                </div>
                <span className="font-semibold tabular-nums">−{money(w.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Wallet ledger" description="Every movement, newest first.">
        {ledgerLoading ? (
          <div className="grid gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted/50" />
            ))}
          </div>
        ) : ledger.length === 0 ? (
          <EmptyState title="No wallet activity yet." hint="Completed jobs credit your wallet." />
        ) : (
          <ul className="grid gap-2">
            {ledger.map((t: any) => {
              const amt = Number(t.amount);
              return (
                <li
                  key={t.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 bg-background/40 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate capitalize">
                      {String(t.type).replace("_", " ")}
                      {t.note ? ` — ${t.note}` : ""}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(t.created_at).toLocaleString()} · balance{" "}
                      {money(t.balance_after)}
                    </div>
                  </div>
                  <span
                    className={`font-semibold tabular-nums ${amt >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {amt >= 0 ? "+" : "−"}
                    {money(Math.abs(amt))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
