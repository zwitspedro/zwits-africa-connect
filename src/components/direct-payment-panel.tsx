import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Banknote, Landmark, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getDirectPaymentDetails, chooseDirectPayment } from "@/lib/direct-payments.functions";

type Accounts = { accountHolder?: string; ecocashNumber?: string; bankName?: string; bankAccount?: string };
export function DirectPaymentPanel({ bookingId, status, paid, providerAssigned }: { bookingId: string; status: string; paid: boolean; providerAssigned: boolean }) {
  const qc = useQueryClient();
  const read = useServerFn(getDirectPaymentDetails);
  const choose = useServerFn(chooseDirectPayment);
  const eligible = providerAssigned && ["accepted", "travelling", "provider_arriving", "arrived", "in_progress", "completed"].includes(status);
  const details = useQuery({ queryKey: ["direct-payment", bookingId], enabled: eligible, queryFn: () => read({ data: { bookingId } }) });
  const change = useMutation({
    mutationFn: (method: "cash" | "direct_ecocash" | "direct_bank") => choose({ data: { bookingId, method } }),
    onSuccess: () => { void qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!eligible) return <p className="mt-4 text-xs text-muted-foreground">Cash on completion. Direct EcoCash or bank payment can be chosen after your provider accepts and shares account details.</p>;
  const receipt = details.data?.receipt;
  const accounts = (receipt?.account_snapshot ?? details.data?.accounts) as Accounts | null;
  return <div className="mt-5 grid gap-3 border-t border-border pt-4">
    <h2 className="text-sm font-semibold">Pay your provider</h2>
    {details.isPending && <p className="text-sm text-muted-foreground">Loading payment details…</p>}
    {details.isError && <div role="alert"><p className="text-sm text-destructive">Could not load account details.</p><Button variant="outline" onClick={() => void details.refetch()}>Retry</Button></div>}
    {!paid && !receipt && !details.isPending && !details.isError && <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={change.isPending} onClick={() => change.mutate("cash")}><Banknote />Cash on completion</Button>
      <Button variant="outline" disabled={change.isPending || !accounts?.ecocashNumber} onClick={() => { if (window.confirm("Choose direct EcoCash payment? The account details will be locked for this booking. Zwits does not send the transfer.")) change.mutate("direct_ecocash"); }}><Smartphone />Provider’s EcoCash</Button>
      <Button variant="outline" disabled={change.isPending || !accounts?.bankAccount} onClick={() => { if (window.confirm("Choose direct bank payment? The account details will be locked for this booking. Zwits does not send the transfer.")) change.mutate("direct_bank"); }}><Landmark />Provider’s bank account</Button>
    </div>}
    {!receipt && !accounts && !details.isPending && <p className="text-xs text-muted-foreground">Your provider has not shared direct-payment details. Cash remains available.</p>}
    {receipt && accounts && <>
      <dl className="grid gap-2 text-sm break-words">
        <div><dt className="text-muted-foreground">Account holder</dt><dd>{accounts.accountHolder}</dd></div>
        {accounts.ecocashNumber && <div><dt className="text-muted-foreground">EcoCash number</dt><dd>{accounts.ecocashNumber}</dd></div>}
        {accounts.bankName && <div><dt className="text-muted-foreground">Bank</dt><dd>{accounts.bankName}</dd></div>}
        {accounts.bankAccount && <div><dt className="text-muted-foreground">Account number</dt><dd>{accounts.bankAccount}</dd></div>}
      </dl>
      <p className="text-xs text-muted-foreground">{receipt.confirmed_at ? "Your provider confirmed receipt. Zwits did not process the transfer." : "Pay the agreed amount using your own EcoCash or bank service after completion. Check the account holder with your provider. Payment stays pending until your provider confirms receipt. Never share your PIN."}</p>
    </>}
  </div>;
}