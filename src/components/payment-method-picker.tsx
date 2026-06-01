import { Smartphone, Wallet, CreditCard, Banknote } from "lucide-react";

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
}[] = [
  { id: "ecocash", name: "EcoCash", hint: "Econet mobile money", icon: Smartphone, refLabel: "EcoCash number", refPlaceholder: "+263 77 123 4567", refType: "tel", refPattern: "^\\+?[0-9 ]{9,16}$", needsRef: true },
  { id: "onemoney", name: "OneMoney", hint: "NetOne wallet", icon: Smartphone, refLabel: "OneMoney number", refPlaceholder: "+263 71 123 4567", refType: "tel", refPattern: "^\\+?[0-9 ]{9,16}$", needsRef: true },
  { id: "innbucks", name: "InnBucks", hint: "Scan-to-pay voucher", icon: Wallet, refLabel: "InnBucks phone", refPlaceholder: "+263 …", refType: "tel", refPattern: "^\\+?[0-9 ]{9,16}$", needsRef: true },
  { id: "card", name: "Visa / Mastercard", hint: "Debit or credit card", icon: CreditCard, refLabel: "Card last 4 digits", refPlaceholder: "1234", refType: "text", refPattern: "^[0-9]{4}$", needsRef: true },
  { id: "cash", name: "Cash on delivery", hint: "Pay the provider in person", icon: Banknote, refLabel: "", refPlaceholder: "", refType: "text", needsRef: false },
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
      <div className="grid gap-2 sm:grid-cols-2">
        {PAYMENT_METHODS.map((m) => {
          const active = value === m.id;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <Icon className={`size-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <div className="min-w-0">
                <div className="text-sm font-medium">{m.name}</div>
                <div className="truncate text-xs text-muted-foreground">{m.hint}</div>
              </div>
            </button>
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
          Have the exact amount ready when your provider arrives.
        </p>
      )}
    </div>
  );
}
