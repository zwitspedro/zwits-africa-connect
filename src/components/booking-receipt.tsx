import { CheckCircle2, Copy } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PAYMENT_METHODS, type PaymentMethod } from "./payment-method-picker";

export type BookingReceipt = {
  id: string;
  category: string;
  serviceName: string;
  address: string;
  scheduledFor: string | null;
  paymentMethod: PaymentMethod;
  paymentReference: string | null;
  createdAt: string;
};

function fmtMoney(method: PaymentMethod) {
  return method === "cash" ? "Due on completion" : "Pending confirmation";
}

export function BookingReceiptDialog({
  receipt,
  onClose,
}: {
  receipt: BookingReceipt;
  onClose: () => void;
}) {
  const method = PAYMENT_METHODS.find((m) => m.id === receipt.paymentMethod);
  const code = receipt.id.slice(0, 8).toUpperCase();

  const copy = () => {
    navigator.clipboard.writeText(code);
    toast.success("Reference copied");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <div className="flex flex-col items-center gap-2 bg-primary/10 px-6 pt-8 pb-6 text-center">
          <CheckCircle2 className="size-10 text-primary" />
          <h2 className="font-display text-xl font-bold">Booking confirmed</h2>
          <p className="text-xs text-muted-foreground">
            We've sent your request. You'll get a notification when a provider accepts.
          </p>
          <button
            onClick={copy}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs font-mono"
          >
            Ref: {code} <Copy className="size-3" />
          </button>
        </div>

        <div className="grid gap-3 px-6 py-5 text-sm">
          <Row label="Service" value={receipt.serviceName} />
          <Row label="Address" value={receipt.address} />
          {receipt.scheduledFor && (
            <Row
              label="Scheduled"
              value={new Date(receipt.scheduledFor).toLocaleString()}
            />
          )}
          <div className="my-1 border-t border-dashed border-border" />
          <Row label="Payment method" value={method?.name ?? receipt.paymentMethod} />
          {receipt.paymentReference && (
            <Row label="Reference" value={receipt.paymentReference} mono />
          )}
          <Row label="Amount" value={fmtMoney(receipt.paymentMethod)} />
          <Row
            label="Booked at"
            value={new Date(receipt.createdAt).toLocaleString()}
          />

          <div className="mt-2 rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
            Mock receipt — Paynow is not live yet. The provider will confirm
            payment manually on arrival.
          </div>
        </div>

        <div className="flex gap-2 border-t border-border p-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm font-medium"
          >
            Book another
          </button>
          <Link
            to="/bookings"
            className="flex-1 rounded-full bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
          >
            View bookings
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`max-w-[60%] text-right text-sm ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
