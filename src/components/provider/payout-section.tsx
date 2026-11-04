import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PROVIDER_PAYMENT_PREFERENCES, canSelectProviderPaymentPreference } from "@/lib/provider-payment-preferences";
import { Panel } from "./dashboard-kit";
import type { ProviderData } from "./use-provider-data";

export function PayoutSection({ data }: { data: ProviderData }) {
  const { user, onboardingRow } = data;
  const qc = useQueryClient();
  const [method, setMethod] = useState(onboardingRow?.payout_method ?? "cash");
  const [bankName, setBankName] = useState(onboardingRow?.bank_name ?? "");
  const [bankAccount, setBankAccount] = useState(onboardingRow?.bank_account ?? "");
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to save payment details.");
      if (!canSelectProviderPaymentPreference(method) && method !== onboardingRow?.payout_method) {
        throw new Error("That payment method is not available yet.");
      }
      const { data: saved, error } = await supabase.from("provider_onboarding").upsert({
        user_id: user.id,
        payout_method: method,
        bank_name: bankName.trim() || null,
        bank_account: bankAccount.trim() || null,
      }, { onConflict: "user_id" }).select("user_id").single();
      if (error) throw error;
      if (!saved) throw new Error("Your payment details were not saved.");
    },
    onSuccess: async () => {
      setError(null);
      await qc.invalidateQueries({ queryKey: ["provider-onboarding-row", user?.id] });
      toast.success("Payment details saved");
    },
    onError: (e: Error) => { setError(e.message); toast.error(e.message); },
  });
  return (
    <Panel title="Bank details & payment preferences">
      <form onSubmit={(e) => { e.preventDefault(); setError(null); save.mutate(); }} className="grid gap-5">
        <fieldset disabled={save.isPending} className="grid gap-3">
          <legend className="mb-3 text-sm font-semibold">Preferred payout method</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {PROVIDER_PAYMENT_PREFERENCES.map((option) => (
              <label key={option.key} className="flex min-h-12 items-center gap-3 rounded-md border border-input px-4 py-3 text-sm">
                <input type="radio" name="payout-method" value={option.key} checked={method === option.key}
                  disabled={!option.available} onChange={() => setMethod(option.key)} className="size-4 accent-primary" />
                <span className="flex-1">{option.label}</span>
                {!option.available && <span className="text-xs text-muted-foreground">Coming soon</span>}
                {option.available && <Banknote className="size-4 text-primary-text" />}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="text-sm text-muted-foreground">Only money held by Zwits can be requested for payout. Saving details does not send money. Cash customers pay you directly; the 10% commission is recorded separately.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm"><span>Bank name</span>
            <input autoComplete="off" maxLength={120} value={bankName} onChange={(e) => setBankName(e.target.value)} className="min-h-12 rounded-md border border-input bg-background px-3" />
          </label>
          <label className="grid gap-2 text-sm"><span>Bank account number</span>
            <input autoComplete="off" maxLength={80} value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="min-h-12 rounded-md border border-input bg-background px-3" />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Bank details are private and can be saved for future use. Bank payouts are coming soon.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={save.isPending || !user} className="sm:justify-self-start"><Save />{save.isPending ? "Saving…" : "Save payment details"}</Button>
      </form>
    </Panel>
  );
}
