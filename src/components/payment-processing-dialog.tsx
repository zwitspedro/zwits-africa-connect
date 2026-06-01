import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { PAYMENT_METHODS, type PaymentMethod } from "./payment-method-picker";

type Status = "prompting" | "processing" | "succeeded" | "failed";

export function PaymentProcessingDialog({
  method,
  amount,
  reference,
  onSuccess,
  onCancel,
}: {
  method: PaymentMethod;
  amount: number;
  reference: string;
  onSuccess: (transactionId: string) => void;
  onCancel: () => void;
}) {
  const meta = PAYMENT_METHODS.find((m) => m.id === method)!;
  const [status, setStatus] = useState<Status>("prompting");
  const [error, setError] = useState<string | null>(null);

  // Auto-advance from prompting -> processing -> succeeded (mock gateway)
  useEffect(() => {
    if (status !== "processing") return;
    const t = setTimeout(() => {
      // Light validation that mimics gateway-side checks
      if (method === "card" && !/^[0-9]{4}$/.test(reference)) {
        setError("Card declined by issuer");
        setStatus("failed");
        return;
      }
      if (method !== "cash" && method !== "card" && !/^\+?[0-9 ]{9,16}$/.test(reference)) {
        setError("Wallet number rejected");
        setStatus("failed");
        return;
      }
      const txn = `TXN-${Date.now().toString(36).toUpperCase()}`;
      setStatus("succeeded");
      // brief success flash before resolving
      setTimeout(() => onSuccess(txn), 700);
    }, 1800);
    return () => clearTimeout(t);
  }, [status, method, reference, onSuccess]);

  const promptCopy =
    method === "card"
      ? `We'll charge $${amount.toFixed(2)} to the card ending •••• ${reference || "----"}.`
      : `A payment request for $${amount.toFixed(2)} will be sent to ${meta.name} number ${reference || "—"}. Approve it on your phone to continue.`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <meta.icon className="size-6 text-primary" />
          <div>
            <h3 className="font-display text-lg font-semibold">Pay with {meta.name}</h3>
            <p className="text-xs text-muted-foreground">Secure payment · ${amount.toFixed(2)}</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-background/60 p-4 text-sm">
          {status === "prompting" && (
            <>
              <p>{promptCopy}</p>
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" /> Booking is only confirmed after payment succeeds.
              </p>
            </>
          )}
          {status === "processing" && (
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <div>
                <div className="font-medium">Waiting for approval…</div>
                <div className="text-xs text-muted-foreground">
                  {method === "card" ? "Authorising card payment" : "Check your phone and approve the request"}
                </div>
              </div>
            </div>
          )}
          {status === "succeeded" && (
            <div className="flex items-center gap-3 text-emerald-600">
              <CheckCircle2 className="size-5" />
              <div>
                <div className="font-medium text-foreground">Payment received</div>
                <div className="text-xs text-muted-foreground">Finalising your booking…</div>
              </div>
            </div>
          )}
          {status === "failed" && (
            <div className="flex items-start gap-3 text-destructive">
              <XCircle className="size-5 mt-0.5" />
              <div>
                <div className="font-medium">Payment failed</div>
                <div className="text-xs text-muted-foreground">{error ?? "The gateway rejected the transaction."}</div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          {status === "prompting" && (
            <>
              <button onClick={onCancel} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={() => setStatus("processing")}
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
              >
                {method === "card" ? "Authorise" : "Send request"}
              </button>
            </>
          )}
          {status === "processing" && (
            <button disabled className="rounded-full bg-muted px-5 py-2 text-sm text-muted-foreground">
              Processing…
            </button>
          )}
          {status === "failed" && (
            <>
              <button onClick={onCancel} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">
                Close
              </button>
              <button
                onClick={() => { setError(null); setStatus("prompting"); }}
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
              >
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
