import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Receipt } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { DiscrepancyBanner, type DiscrepancyIssue } from "@/components/discrepancy-banner";
import { RoleGate } from "@/components/portal/role-gate";

export const Route = createFileRoute(
  "/_authenticated/admin/reconciliation/booking/$bookingId",
)({
  head: () => ({ meta: [{ title: "Booking payout breakdown — Admin — Zwits" }] }),
  component: AdminBookingBreakdownRoute,
});

type Rate = {
  category: string;
  percent: number;
  min_fee: number;
  active: boolean;
  notes: string | null;
  updated_at: string;
};

function BookingBreakdown() {
  const { bookingId } = Route.useParams();
  const { user } = useAuth();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const isAdmin = (roles ?? []).includes("admin");

  const { data: booking, isLoading } = useQuery({
    queryKey: ["recon-booking", bookingId],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id,category,price,status,payment_status,payment_method,payment_reference,provider_id,customer_id,address,description,scheduled_for,created_at,updated_at",
        )
        .eq("id", bookingId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: rate } = useQuery({
    queryKey: ["recon-booking-rate", booking?.category],
    enabled: !!booking?.category,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_rates")
        .select("category,percent,min_fee,active,notes,updated_at")
        .eq("category", booking!.category)
        .maybeSingle();
      if (error) throw error;
      return data as Rate | null;
    },
  });

  const { data: provider } = useQuery({
    queryKey: ["recon-booking-provider", booking?.provider_id],
    enabled: !!booking?.provider_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id,business_name,user_id,city,category,hourly_rate")
        .eq("id", booking!.provider_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (rolesLoading)
    return (
      <SiteShell>
        <div className="p-10 text-sm text-muted-foreground">Loading…</div>
      </SiteShell>
    );
  if (!isAdmin) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Admins only</h1>
        </section>
      </SiteShell>
    );
  }

  if (isLoading)
    return (
      <SiteShell>
        <div className="p-10 text-sm text-muted-foreground">Loading booking…</div>
      </SiteShell>
    );
  if (!booking)
    return (
      <SiteShell>
        <section className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Booking not found</h1>
          <Link to="/admin/reconciliation" className="mt-3 inline-block text-sm text-primary">
            Back to reconciliation
          </Link>
        </section>
      </SiteShell>
    );

  const price = Number(booking.price ?? 0);
  const percent = rate?.active ? Number(rate.percent) : 0;
  const minFee = rate?.active ? Number(rate.min_fee) : 0;
  const pctFee = (price * percent) / 100;
  const rawCommission = rate?.active ? pctFee + minFee : 0;
  // Min-fee handling: commission can't exceed gross (provider never pays out negative)
  const cappedCommission = Math.min(rawCommission, price);
  const minFeeCapped = rawCommission > price;
  // Adjustments: no schema field today — surface as zero for transparency
  const adjustments = 0;
  const totalFee = cappedCommission - adjustments;
  const net = price - totalFee;
  const effective = price > 0 ? (totalFee / price) * 100 : 0;

  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          to="/admin/reconciliation"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> Back to reconciliation
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-wider text-primary">
              <Receipt className="size-3" /> Booking payout
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold capitalize">
              {booking.category} · ${price.toFixed(2)}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Booking ID <span className="font-mono">{booking.id}</span>
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider ${
              booking.status === "completed"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {booking.status}
          </span>
        </div>

        {(() => {
          // "Stored" payout = what the provider would see without the cap or with no rate
          const storedNet = rate?.active ? price - rawCommission : price;
          const issues: DiscrepancyIssue[] = [];
          if (!rate) issues.push({ kind: "missing_rate", label: `No rate row exists for category “${booking.category}”.` });
          else if (!rate.active) issues.push({ kind: "rate_inactive", label: `Rate for “${booking.category}” is marked inactive.` });
          if (minFeeCapped) issues.push({ kind: "min_fee_cap", label: "Min-fee cap reduced commission to gross.", amount: rawCommission - price });
          if (price <= 0) issues.push({ kind: "zero_price", label: "Booking has no price recorded." });
          if (booking.payment_status !== "paid") issues.push({ kind: "unpaid", label: `Payment status is “${booking.payment_status ?? "—"}” — payout not yet collectable.` });
          if (Math.abs(net - storedNet) > 0.01) issues.push({ kind: "net_mismatch", label: "Recomputed net diverges from provider's stored payout snapshot.", amount: net - storedNet });
          return <DiscrepancyBanner className="mt-6" computedNet={net} storedNet={storedNet} issues={issues} />;
        })()}


        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Kpi label="Gross" value={`$${price.toFixed(2)}`} />
          <Kpi
            label="Commission"
            value={`$${totalFee.toFixed(2)}`}
            sub={rate?.active ? `${effective.toFixed(2)}% effective` : "No active rate"}
          />
          <Kpi label="Net payout" value={`$${net.toFixed(2)}`} sub="To provider" />
        </div>

        <Panel title="Net payout calculation" className="mt-6">
          {rate?.active ? (
            <div className="space-y-2 text-sm">
              <Calc label="Gross booking price" value={`$${price.toFixed(2)}`} />
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Commission for category “{booking.category}”
                </div>
                <div className="mt-1 space-y-1.5">
                  <Calc
                    label={`Percent fee · ${percent.toFixed(2)}% × $${price.toFixed(2)}`}
                    value={`$${pctFee.toFixed(2)}`}
                  />
                  <Calc
                    label={`Flat minimum fee · per booking`}
                    value={`+ $${minFee.toFixed(2)}`}
                  />
                  <Calc
                    label="Raw commission (percent + min fee)"
                    value={`$${rawCommission.toFixed(2)}`}
                  />
                  {minFeeCapped && (
                    <Calc
                      label="Min-fee cap · commission limited to gross"
                      value={`− $${(rawCommission - price).toFixed(2)}`}
                    />
                  )}
                  <Calc label="Commission applied" value={`$${cappedCommission.toFixed(2)}`} />
                </div>
              </div>
              <Calc
                label="Adjustments (refunds, manual credits)"
                value={`− $${adjustments.toFixed(2)}`}
              />
              <div className="border-t border-border/60 pt-2">
                <Calc label="Total commission charged" value={`$${totalFee.toFixed(2)}`} bold />
                <Calc
                  label="Net payout · gross − commission − adjustments"
                  value={`$${net.toFixed(2)}`}
                  bold
                />
              </div>
              <p className="pt-1 text-[11px] text-muted-foreground">
                Rate last updated {new Date(rate.updated_at).toLocaleString()}
                {rate.notes ? ` · ${rate.notes}` : ""}
                {minFeeCapped && " · Min-fee cap applied because raw commission exceeded gross."}
                {adjustments === 0 && " · No adjustments recorded for this booking."}
              </p>
            </div>
          ) : (
            <p className="text-sm text-amber-500">
              No active commission rate configured for category “{booking.category}”. Net payout
              equals gross (${price.toFixed(2)}).
            </p>
          )}
        </Panel>


        <Panel title="Booking details" className="mt-4">
          <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            <Field label="Payment status" value={booking.payment_status ?? "—"} />
            <Field label="Payment method" value={booking.payment_method ?? "—"} />
            <Field label="Payment reference" value={booking.payment_reference ?? "—"} />
            <Field label="Created" value={new Date(booking.created_at).toLocaleString()} />
            <Field label="Updated" value={new Date(booking.updated_at).toLocaleString()} />
            <Field
              label="Scheduled for"
              value={booking.scheduled_for ? new Date(booking.scheduled_for).toLocaleString() : "—"}
            />
            <Field
              label="Address"
              value={booking.address}
              className="col-span-2 sm:col-span-3"
            />
            {booking.description && (
              <Field
                label="Description"
                value={booking.description}
                className="col-span-2 sm:col-span-3"
              />
            )}
          </dl>
        </Panel>

        <Panel title="Provider" className="mt-4">
          {provider ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <div className="font-semibold">{provider.business_name}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {provider.category} · {provider.city}
                </div>
              </div>
              <Link
                to="/admin/reconciliation/provider/$providerId"
                params={{ providerId: provider.id }}
                className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"
              >
                View provider breakdown →
              </Link>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No provider assigned.</p>
          )}
        </Panel>
      </section>
    </SiteShell>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && (
        <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/80">
          {sub}
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Calc({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between ${bold ? "font-semibold" : "text-muted-foreground"}`}
    >
      <span>{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function Field({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{value}</dd>
    </div>
  );
}

function AdminBookingBreakdownRoute() {
  return (
    <RoleGate role="admin">
      <BookingBreakdown />
    </RoleGate>
  );
}
