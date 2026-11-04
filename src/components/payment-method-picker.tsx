import { Smartphone, Wallet, CreditCard, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PaymentMethod = "ecocash" | "onemoney" | "innbucks" | "card" | "cash";

export const PAYMENT_METHODS: {
  id: PaymentMethod;
  name: string;
  hint: string;
  icon: typeof Smartphone;
  refLabel: string;
  refPlaceholder: string;
  refType: "tel" | "text";
  refPattern?: string;
  needsRef: boolean;
  enabled?: boolean;
}[] = [
  { id: "ecocash", name: "EcoCash", hint: "Econet mobile money", icon: Smartphone, refLabel: "EcoCash number", refPlaceholder: "+263 77 123 4567", refType: "tel", refPattern: "^\\+?[0-9 ]{9,16}$", needsRef: true },
  { id: "onemoney", name: "OneMoney", hint: "NetOne wallet", icon: Smartphone, refLabel: "OneMoney number", refPlaceholder: "+263 71 123 4567", refType: "tel", refPattern: "^\\+?[0-9 ]{9,16}$", needsRef: true },
  { id: "innbucks", name: "InnBucks", hint: "Scan-to-pay voucher", icon: Wallet, refLabel: "InnBucks phone", refPlaceholder: "+263 …", refType: "tel", refPattern: "^\\+?[0-9 ]{9,16}$", needsRef: true },
  { id: "card", name: "Visa / Mastercard", hint: "Debit or credit card", icon: CreditCard, refLabel: "Card last 4 digits", refPlaceholder: "1234", refType: "text", refPattern: "^[0-9]{4}$", needsRef: true },
  { id: "cash", name: "Pay with cash", hint: "Pay the provider when the job is completed", icon: Banknote, refLabel: "", refPlaceholder: "", refType: "text", needsRef: false, enabled: true },
];

export function PaymentMethodPicker({
  value,
  onChange,
  reference,
  onReferenceChange,
}: {
  value: PaymentMethod | null;
  onChange: (m: PaymentMethod) => void;
  reference: string;
  onReferenceChange: (v: string) => void;
}) {
  const selected = PAYMENT_METHODS.find((m) => m.id === value);

  return (
    <div className="grid gap-3">
      <Button
        type="button"
        variant={value === "cash" ? "default" : "outline"}
        aria-pressed={value === "cash"}
        onClick={() => {
          onChange("cash");
          onReferenceChange("");
        }}
        className="h-auto min-h-14 w-full justify-start gap-3 whitespace-normal rounded-lg px-4 py-3 text-left"
      >
        <Banknote className="size-5 shrink-0" />
        <span className="grid gap-1">
          <span className="text-sm font-semibold">Pay with cash</span>
          <span className="text-xs font-normal">Pay the provider when the job is completed. Nothing is charged now.</span>
        </span>
      </Button>
      <p className="text-xs text-muted-foreground">
        Card and mobile money (EcoCash, OneMoney, InnBucks) are coming soon.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {PAYMENT_METHODS.filter((m) => m.id !== "cash").map((m) => {
          const active = value === m.id;
          const disabled = !m.enabled;
          const Icon = m.icon;
          return (
            <Button
              key={m.id}
              type="button"
              variant="outline"
              disabled={disabled}
              aria-disabled={disabled}
              aria-pressed={active}
              onClick={() => !disabled && onChange(m.id)}
              className={`h-auto min-h-12 justify-start gap-3 whitespace-normal rounded-lg border p-3 text-left transition ${
                active ? "border-primary bg-primary/10" : "border-border bg-card"
              } ${disabled ? "cursor-not-allowed opacity-50" : "hover:border-primary/40"}`}
            >
              <Icon className={`size-5 ${active ? "text-primary-text" : "text-muted-foreground"}`} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {m.name}
                  {disabled && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-normal text-muted-foreground">
                      Coming soon
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{m.hint}</div>
              </div>
            </Button>
          );
        })}
      </div>

      {selected?.needsRef && (
        <label className="grid gap-1.5">
          <span className="text-xs text-muted-foreground">{selected.refLabel}</span>
          <input
            required
            type={selected.refType}
            inputMode={selected.refType === "tel" ? "tel" : "text"}
            pattern={selected.refPattern}
            maxLength={32}
            value={reference}
            onChange={(e) => onReferenceChange(e.target.value)}
            placeholder={selected.refPlaceholder}
            className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
          />
          <span className="text-[11px] text-muted-foreground">
            You'll receive a confirmation prompt on your phone. Payment is captured on service completion.
          </span>
        </label>
      )}

      {value === "cash" && (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Have the agreed amount ready to pay when the job is completed.
        </p>
      )}
    </div>
  );
}
