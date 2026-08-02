import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, Smartphone, Landmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel } from "./dashboard-kit";
import type { ProviderData } from "./use-provider-data";

/**
 * Payout details are stored provider-agnostically so new Zimbabwean payment
 * rails can be added without changing the schema.
 */
const METHODS = [
  { key: "ecocash", label: "EcoCash", icon: Smartphone, field: "mobile" as const, hint: "07xx xxx xxx" },
  { key: "innbucks", label: "InnBucks", icon: Smartphone, field: "mobile" as const, hint: "07xx xxx xxx" },
  { key: "mukuru", label: "Mukuru", icon: Smartphone, field: "mobile" as const, hint: "07xx xxx xxx" },
  { key: "bank", label: "Bank transfer / ZIPIT", icon: Landmark, field: "bank" as const, hint: "Account number" },
];

export function PayoutSection({ data }: { data: ProviderData }) {
  const { user, onboardingRow } = data;
  const qc = useQueryClient();
  const [method, setMethod] = useState(onboardingRow?.payout_method ?? "ecocash");
  const [mobile, setMobile] = useState(onboardingRow?.mobile_money_number ?? "");
  const [bankName, setBankName] = useState(onboardingRow?.bank_name ?? "");
  const [bankAccount, setBankAccount] = useState(onboardingRow?.bank_account ?? "");

  const selected = METHODS.find((m) => m.key === method) ?? METHODS[0];

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("provider_onboarding").upsert(
        {
          user_id: user!.id,
          payout_method: method,
          mobile_money_number: selected.field === "mobile" ? mobile : onboardingRow?.mobile_money_number ?? null,
          bank_name: selected.field === "bank" ? bankName : onboardingRow?.bank_name ?? null,
          bank_account: selected.field === "bank" ? bankAccount : onboardingRow?.bank_account ?? null,
        } as any,
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved ✓");
      qc.invalidateQueries({ queryKey: ["provider-onboarding-row"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save"),
  });

  return (
    <Panel title="Payment details" description="Where Zwits sends your earnings.">
      <div className="grid gap-2 sm:grid-cols-2">
        {METHODS.map((m) => {
          const active = m.key === method;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setMethod(m.key)}
              className={`grid min-h-14 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border p-3 text-left transition ${
                active ? "border-primary bg-primary/10" : "border-border/70 bg-background/40"
              }`}
            >
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${active ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <m.icon className="size-5" />
              </span>
              <span className="truncate text-sm font-medium">{m.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3">
        {selected.field === "mobile" ? (
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">{selected.label} number</span>
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              inputMode="tel"
              placeholder={selected.hint}
              className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
            />
          </label>
        ) : (
          <>
            <label className="grid gap-1 text-xs">
              <span className="text-muted-foreground">Bank name</span>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm" />
            </label>
            <label className="grid gap-1 text-xs">
              <span className="text-muted-foreground">Account number</span>
              <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} inputMode="numeric" className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm" />
            </label>
          </>
        )}

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          <Banknote className="size-4" /> {save.isPending ? "Saving…" : "Save payout details"}
        </button>
      </div>
    </Panel>
  );
}
