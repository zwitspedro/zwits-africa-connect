import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Banknote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmBookingPayment } from "@/lib/payments.functions";

/** Provider confirms they collected cash; the server settles the booking ledger. */
export function CashReceivedButton({ bookingId, className }: { bookingId: string; className?: string }) {
  const qc = useQueryClient();
  const confirm = useServerFn(confirmBookingPayment);
  const m = useMutation({
    mutationFn: () => confirm({ data: { bookingId } }),
    onSuccess: (r) => {
      toast.success(`Cash recorded. Zwits commission $${Number(r.commission).toFixed(2)} added to your wallet.`);
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || "Could not record the cash payment."),
  });
  return (
    <Button size="sm" variant="outline" className={className} disabled={m.isPending} onClick={() => m.mutate()}>
      <Banknote className="size-4" /> {m.isPending ? "Recording…" : "I received the cash"}
    </Button>
  );
}
