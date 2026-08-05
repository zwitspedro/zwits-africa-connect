import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Smartphone, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  AppBar,
  Card,
  Empty,
  Pill,
  Screen,
  Section,
  SkeletonList,
  StatTile,
  money,
} from "@/mobile/ui";

export const Route = createFileRoute("/m/customer/wallet")({ component: WalletScreen });

/** Spend + payment history, read from the bookings and deliveries the customer already owns. */
function WalletScreen() {
  const { user } = useAuth();

  const payments = useQuery({
    queryKey: ["m", "wallet", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [jobs, parcels] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, category, price, payment_method, payment_status, created_at, status")
          .eq("customer_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(60),
        supabase
          .from("deliveries")
          .select("id, service_tier, price, payment_method, payment_status, created_at, status")
          .eq("customer_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(60),
      ]);
      const rows = [
        ...(jobs.data ?? []).map((j) => ({ ...j, kind: "Service", title: j.category })),
        ...(parcels.data ?? []).map((d) => ({ ...d, kind: "Delivery", title: d.service_tier })),
      ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      const paid = rows.filter((r) => r.payment_status === "paid");
      const pending = rows.filter((r) => r.payment_status !== "paid" && r.status !== "cancelled");
      return {
        rows,
        totalPaid: paid.reduce((t, r) => t + Number(r.price ?? 0), 0),
        outstanding: pending.reduce((t, r) => t + Number(r.price ?? 0), 0),
      };
    },
  });

  return (
    <>
      <AppBar title="Wallet" subtitle="Payments and spend" back />
      <Screen>
        <Section>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Paid" value={money(payments.data?.totalPaid)} icon={Wallet} />
            <StatTile
              label="Outstanding"
              value={money(payments.data?.outstanding)}
              icon={Banknote}
            />
          </div>
        </Section>

        <Section title="Payment methods">
          <Card className="grid gap-2">
            <div className="flex min-h-12 items-center gap-3 rounded-2xl bg-muted/60 px-3">
              <Smartphone className="size-4 text-accent" />
              <span className="flex-1 text-sm font-medium">EcoCash</span>
              <Pill tone="accent">Default</Pill>
            </div>
            <div className="flex min-h-12 items-center gap-3 rounded-2xl bg-muted/60 px-3">
              <Banknote className="size-4 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">Cash on completion</span>
              <Pill>Available</Pill>
            </div>
          </Card>
        </Section>

        <Section title="History">
          {payments.isLoading ? (
            <SkeletonList rows={4} />
          ) : (payments.data?.rows ?? []).length === 0 ? (
            <Empty
              icon={Wallet}
              title="No payments yet"
              hint="Your job and delivery payments will show up here."
            />
          ) : (
            <div className="grid gap-3">
              {(payments.data?.rows ?? []).map((r: any) => (
                <Card key={`${r.kind}-${r.id}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold capitalize">{r.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.kind} · {new Date(r.created_at).toLocaleDateString()} ·{" "}
                        {r.payment_method ?? "—"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">{money(r.price)}</p>
                      <Pill tone={r.payment_status === "paid" ? "accent" : "warning"}>
                        {r.payment_status}
                      </Pill>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </Screen>
    </>
  );
}
