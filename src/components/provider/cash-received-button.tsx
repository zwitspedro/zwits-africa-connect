import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Banknote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmBookingPayment } from "@/lib/payments.functions";

/** Provider confirms they collected cash; the server settles the booking ledger. */
export function CashReceivedButton({ bookingId, className, method = "cash" }: { bookingId: string; className?: string; method?: string }) {
  const qc = useQueryClient();
  const confirm = useServerFn(confirmBookingPayment);
  const m = useMutation({
    mutationFn: () => confirm({ data: { bookingId } }),
    onSuccess: (r) => {
      toast.success(`Receipt recorded. Zwits commission owed: $${Number(r.commission).toFixed(2)}.`);
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || "Could not record the cash payment."),
  });
  return (
    <Button size="sm" variant="outline" className={className} disabled={m.isPending} onClick={() => { if (window.confirm(method === "cash" ? "Confirm you received the agreed cash payment from the customer?" : "Confirm the full agreed payment has arrived in your personal account? A customer screenshot alone is not proof of receipt.")) m.mutate(); }}>
      <Banknote className="size-4" /> {m.isPending ? "Recording…" : method === "cash" ? "I received the cash" : "I received the transfer"}
    </Button>
  );
}
