import { useEffect, useMemo, useState } from "react";
import { Loader2, CheckCircle2, XCircle, ShieldCheck, AlertTriangle, RotateCcw, Phone } from "lucide-react";
import { PAYMENT_METHODS, type PaymentMethod } from "./payment-method-picker";

type Status = "prompting" | "processing" | "succeeded" | "failed";

// Provider-specific MNO prefixes (Zimbabwe). InnBucks supports all networks.
const MNO_PREFIXES: Record<Exclude<PaymentMethod, "card" | "cash">, { label: string; prefixes: string[] }> = {
  ecocash: { label: "Econet (EcoCash)", prefixes: ["77", "78"] },
  onemoney: { label: "NetOne (OneMoney)", prefixes: ["71"] },
  innbucks: { label: "any Zimbabwean mobile", prefixes: ["71", "73", "77", "78"] },
};

function normalizePhone(raw: string) {
  // Strip spaces and a leading +, then drop a leading 263 / 0.
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.startsWith("263")) return digits.slice(3);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

type Preflight =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok"; phone: string }
  | { state: "blocked"; code: "format" | "prefix"; message: string; detail: string };

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
  const [preflight, setPreflight] = useState<Preflight>({ state: "idle" });

  const isWallet = method === "ecocash" || method === "onemoney" || method === "innbucks";

  // Pre-flight checks for wallet methods: format and network are validated
  // locally. Balance and funds are decided by the payment provider, never here.
  useEffect(() => {
    if (!isWallet) {
      setPreflight({ state: "idle" });
      return;
    }
    const raw = reference.trim();
    if (!raw) {
      setPreflight({
        state: "blocked",
        code: "format",
        message: "Enter your wallet number",
        detail: `We need your ${meta.name} number to send the payment request.`,
      });
      return;
    }
    if (!/^\+?[0-9 ]{9,16}$/.test(raw)) {
      setPreflight({
        state: "blocked",
        code: "format",
        message: "Number format looks off",
        detail: "Use the international format like +263 77 123 4567, or a local 07x number.",
      });
      return;
    }
    const phone = normalizePhone(raw);
    const allowed = MNO_PREFIXES[method as keyof typeof MNO_PREFIXES];
    const prefix2 = phone.slice(0, 2);
    if (!allowed.prefixes.includes(prefix2)) {
      setPreflight({
        state: "blocked",
        code: "prefix",
        message: `This isn't an ${allowed.label} number`,
        detail: `${meta.name} only works with numbers starting with ${allowed.prefixes.map((p) => `0${p}`).join(", ")}.`,
      });
      return;
    }
    setPreflight({ state: "ok", phone });
  }, [isWallet, method, reference, meta.name]);

  const canStart = useMemo(() => {
    if (!isWallet) return true; // card / other handled by existing flow
    return preflight.state === "ok";
  }, [isWallet, preflight]);

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
      // The reference the customer actually paid with is what gets stored on
      // the booking — the backend verifies it before any money is settled.
      const txn = reference.trim() || `CASH-${Date.now().toString(36).toUpperCase()}`;
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

              {isWallet && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Pre-flight checks
                    </div>
                    {preflight.state === "blocked" && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                        {preflight.code === "format" ? "Format error" : "Wrong network"}
                      </span>
                    )}
                    {preflight.state === "ok" && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                        Ready
                      </span>
                    )}
                  </div>

                  <PreflightRow
                    icon={Phone}
                    label="Wallet number"
                    ok={preflight.state === "ok"}
                    checking={false}
                    blocked={preflight.state === "blocked"}
                    detail={
                      preflight.state === "blocked"
                        ? preflight.detail
                        : preflight.state === "ok"
                          ? `Confirmed on ${meta.name} · ${preflight.phone}`
                          : "Checking format & network…"
                    }
                  />

                  {preflight.state === "blocked" && (
                    <div className="mt-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs">
                      <div className="flex items-start gap-2 text-destructive">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold">{preflight.message}</div>
                          <div className="mt-0.5 text-muted-foreground">{preflight.detail}</div>
                          <div className="mt-1.5 text-[11px] font-medium text-destructive">
                            {preflight.code === "format"
                              ? "Fix: re-enter the number as +263 7X XXX XXXX or 07X XXX XXXX."
                              : `Fix: use a ${MNO_PREFIXES[method as keyof typeof MNO_PREFIXES].label} number, or switch payment method.`}
                          </div>
                        </div>
                      </div>
                      {onChangeReference && (
                        <label className="mt-3 grid gap-1.5">
                          <span className="text-[11px] text-muted-foreground">Update {meta.name} number</span>
                          <input
                            type="tel"
                            inputMode="tel"
                            maxLength={20}
                            value={reference}
                            onChange={(e) => onChangeReference(e.target.value)}
                            placeholder="+263 77 123 4567"
                            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}

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
                disabled={!canStart}
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {method === "card"
                  ? "Authorise"
                  : preflight.state === "checking"
                  ? "Checking…"
                  : "Send request"}
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

function PreflightRow({
  icon: Icon,
  label,
  ok,
  checking,
  blocked,
  detail,
}: {
  icon: typeof Phone;
  label: string;
  ok: boolean;
  checking: boolean;
  blocked: boolean;
  detail: string;
}) {
  const tone = blocked
    ? "border-destructive/30 bg-destructive/5"
    : ok
    ? "border-emerald-500/30 bg-emerald-500/5"
    : "border-border bg-background/60";
  const statusIcon = checking ? (
    <Loader2 className="size-4 animate-spin text-muted-foreground" />
  ) : blocked ? (
    <XCircle className="size-4 text-destructive" />
  ) : ok ? (
    <CheckCircle2 className="size-4 text-emerald-600" />
  ) : (
    <Loader2 className="size-4 text-muted-foreground/60" />
  );
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-2.5 ${tone}`}>
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium">{label}</span>
          {statusIcon}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}
