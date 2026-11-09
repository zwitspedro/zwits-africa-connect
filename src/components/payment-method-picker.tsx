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
  onReferenceChange,
}: {
  value: PaymentMethod | null;
  onChange: (m: PaymentMethod) => void;
  reference: string;
  onReferenceChange: (v: string) => void;
}) {
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
        Direct payment to your provider’s personal EcoCash or bank account can be chosen from booking details after acceptance. Platform card and mobile-money payments are unavailable.
      </p>
      {value === "cash" && (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Have the agreed amount ready to pay when the job is completed.
        </p>
      )}
    </div>
  );
}
