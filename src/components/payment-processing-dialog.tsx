import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, ShieldCheck, AlertTriangle, RotateCcw } from "lucide-react";
import { PAYMENT_METHODS, type PaymentMethod } from "./payment-method-picker";

type Status = "prompting" | "processing" | "succeeded" | "failed";

export function PaymentProcessingDialog({
  method,
  amount,
  reference,
  onSuccess,
  onFailure,
  onCancel,
  onChangeMethod,
  onChangeReference,
}: {
  method: PaymentMethod;
  amount: number;
  reference: string;
  onSuccess: (transactionId: string) => void;
  onFailure?: (reason: string) => void;
  onCancel: () => void;
  onChangeMethod?: (m: PaymentMethod) => void;
  onChangeReference?: (v: string) => void;
}) {
  const meta = PAYMENT_METHODS.find((m) => m.id === method)!;
  const [status, setStatus] = useState<Status>("prompting");
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  // Auto-advance from prompting -> processing -> succeeded (mock gateway)
  useEffect(() => {
    if (status !== "processing") return;
    const t = setTimeout(() => {
      // Light validation that mimics gateway-side checks
      if (method === "card") {
        if (!reference.trim()) {
          setError("Card number missing");
          setErrorDetail("Enter the last 4 digits of your card to continue.");
          setStatus("failed");
          onFailure?.("Card number missing");
          return;
        }
        if (!/^[0-9]{4}$/.test(reference)) {
          setError("Card declined by issuer");
          setErrorDetail("Check the card details and ensure you have sufficient funds. If the problem persists, try a different card or wallet.");
          setStatus("failed");
          onFailure?.("Card declined by issuer");
          return;
        }
      }
      if (method !== "cash" && method !== "card") {
        if (!reference.trim()) {
          setError("Wallet number missing");
          setErrorDetail(`Enter your ${meta.name} wallet number to continue.`);
          setStatus("failed");
          onFailure?.("Wallet number missing");
          return;
        }
        if (!/^\+?[0-9 ]{9,16}$/.test(reference)) {
          setError("Wallet number rejected");
          setErrorDetail("The number format is invalid or the wallet is not active. Check the number and try again.");
          setStatus("failed");
          onFailure?.("Wallet number rejected");
          return;
        }
      }
      // Simulate a random gateway failure ~15% of the time for realism
      if (Math.random() < 0.15) {
        const failures = [
          { error: "Gateway timeout", detail: "The payment provider did not respond in time. Please retry." },
          { error: "Insufficient balance", detail: "Your account does not have enough funds for this transaction. Top up and try again." },
          { error: "Transaction limit exceeded", detail: "This payment exceeds your daily limit. Use a different method or contact your provider." },
        ];
        const f = failures[Math.floor(Math.random() * failures.length)];
        setError(f.error);
        setErrorDetail(f.detail);
        setStatus("failed");
        onFailure?.(f.error);
        return;
      }
      const txn = `TXN-${Date.now().toString(36).toUpperCase()}`;
      setStatus("succeeded");
      // brief success flash before resolving
      setTimeout(() => onSuccess(txn), 700);
    }, 1800);
    return () => clearTimeout(t);
  }, [status, method, reference, onSuccess, onFailure, meta.name]);

  const promptCopy =
    method === "card"
      ? `We'll charge $${amount.toFixed(2)} to the card ending •••• ${reference || "----"}.`
      : `A payment request for $${amount.toFixed(2)} will be sent to ${meta.name} number ${reference || "—"}. Approve it on your phone to continue.`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          {status === "failed" ? (
            <div className="grid size-10 place-items-center rounded-full bg-destructive/10">
              <AlertTriangle className="size-5 text-destructive" />
            </div>
          ) : (
            <meta.icon className="size-6 text-primary" />
          )}
          <div>
            <h3 className="font-display text-lg font-semibold">
              {status === "failed" ? "Payment failed" : `Pay with ${meta.name}`}
            </h3>
            <p className="text-xs text-muted-foreground">
              {status === "failed" ? "Your booking has not been confirmed" : `Secure payment · $${amount.toFixed(2)}`}
            </p>
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
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-destructive">
                <XCircle className="size-5 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium">{error ?? "Payment could not be completed"}</div>
                  {errorDetail && (
                    <div className="mt-1 text-xs text-muted-foreground">{errorDetail}</div>
                  )}
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/5 p-2.5 text-xs text-destructive">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    <span>No money has been deducted. Switch method or retry below.</span>
                  </div>
                </div>
              </div>

              {onChangeMethod && (
                <div className="border-t border-border pt-4">
                  <div className="mb-2 text-xs font-medium text-foreground">Switch payment method</div>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.filter((m) => m.id !== "cash").map((m) => {
                      const Icon = m.icon;
                      const active = m.id === method;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            if (active) return;
                            onChangeMethod(m.id);
                            onChangeReference?.("");
                            setError(null);
                            setErrorDetail(null);
                            setStatus("prompting");
                          }}
                          className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition ${
                            active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          <Icon className={`size-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="min-w-0">
                            <div className="truncate text-xs font-medium">{m.name}</div>
                            <div className="truncate text-[10px] text-muted-foreground">{m.hint}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {(() => {
                    const sel = PAYMENT_METHODS.find((m) => m.id === method);
                    if (!sel?.needsRef || !onChangeReference) return null;
                    return (
                      <label className="mt-3 grid gap-1.5">
                        <span className="text-[11px] text-muted-foreground">{sel.refLabel}</span>
                        <input
                          type={sel.refType}
                          inputMode={sel.refType === "tel" ? "tel" : "text"}
                          pattern={sel.refPattern}
                          maxLength={32}
                          value={reference}
                          onChange={(e) => onChangeReference(e.target.value)}
                          placeholder={sel.refPlaceholder}
                          className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                      </label>
                    );
                  })()}
                </div>
              )}
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
                Change method
              </button>
              <button
                onClick={() => { setError(null); setErrorDetail(null); setStatus("prompting"); }}
                className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
              >
                <RotateCcw className="size-3.5" /> Try again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

