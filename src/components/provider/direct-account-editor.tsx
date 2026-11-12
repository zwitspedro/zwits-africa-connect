import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { normalisePhoneNumber } from "@/lib/phone";

export function DirectAccountEditor({ userId }: { userId: string }) {
  const [holder, setHolder] = useState("");
  const [phone, setPhone] = useState("");
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");
  const [consent, setConsent] = useState(false);
  const row = useQuery({ queryKey: ["provider-direct-account", userId], queryFn: async () => {
    const { data, error } = await supabase.from("provider_direct_accounts").select("*").eq("provider_user_id", userId).maybeSingle();
    if (error) throw error;
    return data;
  } });
  useEffect(() => { if (row.data) { setHolder(row.data.account_holder); setPhone(row.data.ecocash_number ?? ""); setBank(row.data.bank_name ?? ""); setAccount(row.data.bank_account ?? ""); setConsent(true); } }, [row.data]);
  const save = useMutation({ mutationFn: async () => {
    if (!consent) throw new Error("Consent to sharing account details is required.");
    const number = phone.trim() ? normalisePhoneNumber(phone) : null;
    if (phone.trim() && (!number || !/^\+263(77|78)\d{7}$/.test(number))) throw new Error("Enter a valid Econet EcoCash number.");
    const { error } = await supabase.from("provider_direct_accounts").upsert({ provider_user_id: userId, account_holder: holder.trim(), ecocash_number: number, bank_name: bank.trim() || null, bank_account: account.trim() || null, updated_at: new Date().toISOString() });
    if (error) throw error;
  }, onSuccess: () => { toast.success("Direct-payment accounts saved"); void row.refetch(); }, onError: (e: Error) => toast.error(e.message) });
  return <form className="mt-6 grid gap-4 border-t border-border pt-5" onSubmit={e => { e.preventDefault(); save.mutate(); }}>
    <h3 className="text-sm font-semibold">Customer payments to your personal account</h3>
    {row.isError && <p role="alert" className="text-sm text-destructive">Could not load your accounts. <Button variant="link" type="button" onClick={() => void row.refetch()}>Retry</Button></p>}
    <fieldset disabled={row.isPending || row.isError || save.isPending} className="grid gap-4">
      <label className="grid gap-2 text-sm">Account holder name<input required minLength={2} maxLength={120} value={holder} onChange={e=>setHolder(e.target.value)} className="min-h-12 rounded-md border border-input bg-background px-3" /></label>
      <label className="grid gap-2 text-sm">Personal EcoCash number<input type="tel" maxLength={24} value={phone} onChange={e=>setPhone(e.target.value)} className="min-h-12 rounded-md border border-input bg-background px-3" /></label>
      <p className="text-xs text-muted-foreground">Use your registered EcoCash number and account holder name. Never enter your PIN, password or one-time code. Automated Zwits payouts are not connected.</p>
      <label className="grid gap-2 text-sm">Bank name<input maxLength={120} value={bank} onChange={e=>setBank(e.target.value)} className="min-h-12 rounded-md border border-input bg-background px-3" /></label>
      <label className="grid gap-2 text-sm">Bank account number<input maxLength={80} value={account} onChange={e=>setAccount(e.target.value)} className="min-h-12 rounded-md border border-input bg-background px-3" /></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 size-4" />I own these accounts and agree to share these details with customers on my accepted bookings.</label>
      <p className="text-xs text-muted-foreground">These are direct customer payments, not Zwits payouts. Confirm receipt only after the money arrives. Direct payments do not create withdrawable wallet funds; the 10% commission remains owed.</p>
      <Button type="submit" disabled={!consent}><Save />{save.isPending ? "Saving…" : "Save direct-payment accounts"}</Button>
    </fieldset>
  </form>;
}