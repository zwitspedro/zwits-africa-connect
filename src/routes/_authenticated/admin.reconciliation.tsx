import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Scale, Wallet, Download } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/admin/reconciliation")({
  head: () => ({ meta: [{ title: "Reconciliation — Admin — Zwits" }] }),
  component: ReconciliationScreen,
});

type Booking = {
  id: string;
  category: string;
  price: number | null;
  status: string;
  payment_status: string | null;
  provider_id: string | null;
  updated_at: string;
  created_at: string;
};

type Rate = { category: string; percent: number; min_fee: number; active: boolean };

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return { from: isoDate(start), to: isoDate(end) };
}

function ReconciliationScreen() {
  const { user } = useAuth();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const isAdmin = (roles ?? []).includes("admin");

  const def = defaultRange();
  const [from, setFrom] = useState(def.from);
  const [to, setTo] = useState(def.to);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["recon-bookings", from, to],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const start = new Date(`${from}T00:00:00`).toISOString();
      const end = new Date(`${to}T23:59:59.999`).toISOString();
      const { data, error } = await supabase
        .from("bookings")
        .select("id,category,price,status,payment_status,provider_id,updated_at,created_at")
        .eq("status", "completed")
        .gte("updated_at", start)
        .lte("updated_at", end)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
  });

  const { data: rates } = useQuery({
    queryKey: ["recon-rates"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_rates")
        .select("category,percent,min_fee,active");
      if (error) throw error;
      return data as Rate[];
    },
  });

  const { data: providers } = useQuery({
    queryKey: ["recon-providers"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id,business_name,user_id");
      if (error) throw error;
      return data as { id: string; business_name: string; user_id: string }[];
    },
  });

  const rateByCategory = useMemo(() => {
    const m = new Map<string, Rate>();
    (rates ?? []).filter((r) => r.active).forEach((r) => m.set(r.category, r));
    return m;
  }, [rates]);

  const providerById = useMemo(() => {
    const m = new Map<string, { business_name: string }>();
    (providers ?? []).forEach((p) => m.set(p.id, p));
    return m;
  }, [providers]);

  const fee = (b: Booking) => {
    const r = rateByCategory.get(b.category);
    const price = Number(b.price ?? 0);
    if (!r) return 0;
    return (price * Number(r.percent)) / 100 + Number(r.min_fee);
  };

  const rows = bookings ?? [];
  const totals = rows.reduce(
    (acc, b) => {
      const price = Number(b.price ?? 0);
      const f = fee(b);
      acc.gross += price;
      acc.commission += f;
      acc.net += price - f;
      acc.count += 1;
      if (b.payment_status === "paid") acc.paidGross += price;
      else acc.unpaidGross += price;
      return acc;
    },
    { gross: 0, commission: 0, net: 0, count: 0, paidGross: 0, unpaidGross: 0 },
  );

  const byCategory = useMemo(() => {
    const m = new Map<string, { count: number; gross: number; commission: number; net: number }>();
    for (const b of rows) {
      const k = b.category;
      const cur = m.get(k) ?? { count: 0, gross: 0, commission: 0, net: 0 };
      const price = Number(b.price ?? 0);
      const f = fee(b);
      cur.count += 1;
      cur.gross += price;
      cur.commission += f;
      cur.net += price - f;
      m.set(k, cur);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].gross - a[1].gross);
  }, [rows, rateByCategory]);

  const byProvider = useMemo(() => {
    const m = new Map<string, { count: number; gross: number; commission: number; net: number }>();
    for (const b of rows) {
      if (!b.provider_id) continue;
      const cur = m.get(b.provider_id) ?? { count: 0, gross: 0, commission: 0, net: 0 };
      const price = Number(b.price ?? 0);
      const f = fee(b);
      cur.count += 1;
      cur.gross += price;
      cur.commission += f;
      cur.net += price - f;
      m.set(b.provider_id, cur);
    }
    return Array.from(m.entries())
      .map(([id, v]) => ({ id, name: providerById.get(id)?.business_name ?? "Unknown provider", ...v }))
      .sort((a, b) => b.net - a.net);
  }, [rows, providerById, rateByCategory]);

  const exportCsv = () => {
    const header = ["booking_id", "completed_at", "category", "provider", "payment_status", "gross", "commission", "net"];
    const lines = [header.join(",")];
    for (const b of rows) {
      const f = fee(b);
      const price = Number(b.price ?? 0);
      const provider = b.provider_id ? providerById.get(b.provider_id)?.business_name ?? b.provider_id : "—";
      lines.push([
        b.id,
        new Date(b.updated_at).toISOString(),
        b.category,
        `"${provider.replaceAll('"', '""')}"`,
        b.payment_status ?? "",
        price.toFixed(2),
        f.toFixed(2),
        (price - f).toFixed(2),
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reconciliation_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (rolesLoading) return <SiteShell><div className="p-10 text-sm text-muted-foreground">Loading…</div></SiteShell>;
  if (!isAdmin) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">You don't have access to this page.</p>
        </section>
      </SiteShell>
    );
  }

  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setFrom(isoDate(start));
    setTo(isoDate(end));
  };

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3" /> Back to admin
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-wider text-primary">
              <Scale className="size-3" /> Reconciliation
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold">Payout reconciliation</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Compare gross booking totals vs commission deducted vs net provider payouts for a date range.
            </p>
          </div>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"
          >
            <Download className="size-3.5" /> Export CSV
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
          <Field label="From">
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="To">
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setPreset(d)} className="rounded-full border border-border px-3 py-1.5 text-[11px] hover:bg-muted">
                Last {d}d
              </button>
            ))}
          </div>
          <div className="ml-auto text-xs text-muted-foreground">{rows.length} completed bookings</div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Gross" value={`$${totals.gross.toFixed(2)}`} sub={`${totals.count} bookings`} />
          <Kpi label="Commission" value={`$${totals.commission.toFixed(2)}`} sub={totals.gross > 0 ? `${((totals.commission / totals.gross) * 100).toFixed(1)}% effective` : "—"} />
          <Kpi label="Net payouts" value={`$${totals.net.toFixed(2)}`} sub="Owed to providers" />
          <Kpi label="Paid vs unpaid" value={`$${totals.paidGross.toFixed(0)} / $${totals.unpaidGross.toFixed(0)}`} sub="Gross by payment status" />
        </div>

        {totals.gross > 0 && <BalanceBar gross={totals.gross} commission={totals.commission} net={totals.net} />}

        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading bookings…</p>}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel title="By service category" empty={byCategory.length === 0}>
            <Table
              headers={["Category", "#", "Gross", "Commission", "Net"]}
              rows={byCategory.map(([cat, v]) => {
                const r = rateByCategory.get(cat);
                return [
                  <span key="c" className="capitalize">{cat}{r ? <span className="ml-1 text-[10px] text-muted-foreground">({Number(r.percent).toFixed(1)}%+${Number(r.min_fee).toFixed(2)})</span> : <span className="ml-1 text-[10px] text-amber-500">no rate</span>}</span>,
                  v.count,
                  `$${v.gross.toFixed(2)}`,
                  `$${v.commission.toFixed(2)}`,
                  `$${v.net.toFixed(2)}`,
                ];
              })}
            />
          </Panel>

          <Panel title="By provider" empty={byProvider.length === 0}>
            <Table
              headers={["Provider", "#", "Gross", "Commission", "Net"]}
              rows={byProvider.slice(0, 20).map((p) => [
                p.name,
                p.count,
                `$${p.gross.toFixed(2)}`,
                `$${p.commission.toFixed(2)}`,
                `$${p.net.toFixed(2)}`,
              ])}
            />
          </Panel>
        </div>

        <Panel title="Booking-level detail" className="mt-6" empty={rows.length === 0}>
          <Table
            headers={["Completed", "Category", "Provider", "Payment", "Gross", "Commission", "Net"]}
            rows={rows.slice(0, 100).map((b) => {
              const price = Number(b.price ?? 0);
              const f = fee(b);
              const provider = b.provider_id ? providerById.get(b.provider_id)?.business_name ?? "—" : "—";
              return [
                new Date(b.updated_at).toLocaleDateString(),
                <span key="c" className="capitalize">{b.category}</span>,
                provider,
                <span key="p" className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${b.payment_status === "paid" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>{b.payment_status ?? "—"}</span>,
                `$${price.toFixed(2)}`,
                `$${f.toFixed(2)}`,
                `$${(price - f).toFixed(2)}`,
              ];
            })}
          />
          {rows.length > 100 && (
            <p className="mt-2 text-[11px] text-muted-foreground">Showing first 100 of {rows.length}. Export CSV for the full list.</p>
          )}
        </Panel>
      </section>
    </SiteShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wallet className="size-3" /> {label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/80">{sub}</div>}
    </div>
  );
}

function BalanceBar({ gross, commission, net }: { gross: number; commission: number; net: number }) {
  const cPct = (commission / gross) * 100;
  const nPct = (net / gross) * 100;
  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>Gross ${gross.toFixed(2)} = Commission ${commission.toFixed(2)} + Net ${net.toFixed(2)}</span>
        <span>{cPct.toFixed(1)}% fee · {nPct.toFixed(1)}% payout</span>
      </div>
      <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-primary" style={{ width: `${nPct}%` }} />
        <div className="bg-amber-500" style={{ width: `${cPct}%` }} />
      </div>
      <div className="mt-2 flex gap-4 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-primary" /> Net payout</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-amber-500" /> Commission</span>
      </div>
    </div>
  );
}

function Panel({ title, children, className = "", empty }: { title: string; children: React.ReactNode; className?: string; empty?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3">
        {empty ? <p className="text-xs text-muted-foreground">No data in this range.</p> : children}
      </div>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead className="text-muted-foreground">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={`py-1.5 pr-3 ${i >= 2 ? "text-right" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border/60">
              {r.map((cell, j) => (
                <td key={j} className={`py-1.5 pr-3 ${j >= 2 ? "text-right tabular-nums" : ""}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
