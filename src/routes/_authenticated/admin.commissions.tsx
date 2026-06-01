import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Percent, Save, Plus, Trash2, History, ArrowLeft, Power, PowerOff, Wallet } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { services } from "@/data/services";

export const Route = createFileRoute("/_authenticated/admin/commissions")({
  head: () => ({ meta: [{ title: "Commissions — Admin — Zwits" }] }),
  component: CommissionsScreen,
});

type Row = {
  id: string;
  category: string;
  percent: number;
  min_fee: number;
  notes: string | null;
  active: boolean;
  updated_at: string;
};

function CommissionsScreen() {
  const { user } = useAuth();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const isAdmin = (roles ?? []).includes("admin");
  const qc = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);

  const { data: rates, isLoading } = useQuery({
    queryKey: ["commission-rates"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_rates")
        .select("*")
        .order("category", { ascending: true });
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["commission-booking-volume"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("category,price,status")
        .eq("status", "completed");
      if (error) throw error;
      return data;
    },
  });

  const { data: history } = useQuery({
    queryKey: ["commission-history"],
    enabled: !!user && isAdmin && showHistory,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_rate_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const volumeByCategory = useMemo(() => {
    const m = new Map<string, { revenue: number; count: number }>();
    for (const b of bookings ?? []) {
      const entry = m.get(b.category) ?? { revenue: 0, count: 0 };
      entry.revenue += Number(b.price ?? 0);
      entry.count += 1;
      m.set(b.category, entry);
    }
    return m;
  }, [bookings]);

  const existingCategories = new Set((rates ?? []).map((r) => r.category));
  const availableServiceCategories = services
    .map((s) => s.slug)
    .filter((slug) => !existingCategories.has(slug));

  const upsert = useMutation({
    mutationFn: async (row: { id?: string; category: string; percent: number; min_fee: number; notes: string | null; active: boolean }) => {
      if (row.id) {
        const { error } = await supabase
          .from("commission_rates")
          .update({
            percent: row.percent,
            min_fee: row.min_fee,
            notes: row.notes,
            active: row.active,
            updated_by: user!.id,
          })
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("commission_rates").insert({
          category: row.category,
          percent: row.percent,
          min_fee: row.min_fee,
          notes: row.notes,
          active: row.active,
          updated_by: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Commission saved");
      qc.invalidateQueries({ queryKey: ["commission-rates"] });
      qc.invalidateQueries({ queryKey: ["commission-history"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commission_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Commission removed");
      qc.invalidateQueries({ queryKey: ["commission-rates"] });
      qc.invalidateQueries({ queryKey: ["commission-history"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

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

  const projectedFees = (rates ?? []).reduce((sum, r) => {
    const v = volumeByCategory.get(r.category);
    if (!v) return sum;
    return sum + (v.revenue * Number(r.percent)) / 100 + v.count * Number(r.min_fee);
  }, 0);

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3" /> Back to admin
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-wider text-primary">
              <Percent className="size-3" /> Commissions
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold">Commission management</h1>
            <p className="mt-1 text-sm text-muted-foreground">Set the platform fee per service type. Changes apply to new bookings only.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"
          >
            <History className="size-3.5" /> {showHistory ? "Hide" : "View"} change log
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Active rates" value={(rates ?? []).filter((r) => r.active).length} />
          <KpiCard label="Categories" value={rates?.length ?? 0} />
          <KpiCard label="Avg rate" value={`${avg(rates ?? []).toFixed(1)}%`} />
          <KpiCard label="Projected fees" value={`$${projectedFees.toFixed(0)}`} sub="From completed bookings" />
        </div>

        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading rates…</p>}

        <div className="mt-6 grid gap-3">
          {(rates ?? []).map((r) => (
            <RateRow
              key={r.id}
              row={r}
              volume={volumeByCategory.get(r.category)}
              onSave={(patch) => upsert.mutate({ id: r.id, category: r.category, ...patch })}
              onDelete={() => remove.mutate(r.id)}
              saving={upsert.isPending}
            />
          ))}
          {!isLoading && (rates ?? []).length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No commission rates yet. Add one below.</p>
          )}
        </div>

        <AddRateCard
          availableCategories={availableServiceCategories}
          onAdd={(row) => upsert.mutate(row)}
          saving={upsert.isPending}
        />

        {showHistory && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Change log</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Latest 50 changes across all categories.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1.5 pr-3">When</th>
                    <th className="py-1.5 pr-3">Category</th>
                    <th className="py-1.5 pr-3">Change</th>
                    <th className="py-1.5 pr-3 text-right">Percent</th>
                    <th className="py-1.5 pr-3 text-right">Min fee</th>
                    <th className="py-1.5 pr-3">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {(history ?? []).map((h: any) => (
                    <tr key={h.id} className="border-t border-border/60">
                      <td className="py-1.5 pr-3 text-muted-foreground">{new Date(h.created_at).toLocaleString()}</td>
                      <td className="py-1.5 pr-3 font-medium">{h.category}</td>
                      <td className="py-1.5 pr-3 uppercase tracking-wider text-[10px] text-muted-foreground">{h.change_kind}</td>
                      <td className="py-1.5 pr-3 text-right">{Number(h.percent).toFixed(2)}%</td>
                      <td className="py-1.5 pr-3 text-right">${Number(h.min_fee).toFixed(2)}</td>
                      <td className="py-1.5 pr-3">{h.active ? "yes" : "no"}</td>
                    </tr>
                  ))}
                  {(history ?? []).length === 0 && (
                    <tr><td colSpan={6} className="py-3 text-center text-muted-foreground">No history yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </SiteShell>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/80">{sub}</div>}
    </div>
  );
}

function RateRow({
  row,
  volume,
  onSave,
  onDelete,
  saving,
}: {
  row: Row;
  volume: { revenue: number; count: number } | undefined;
  onSave: (patch: { percent: number; min_fee: number; notes: string | null; active: boolean }) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [percent, setPercent] = useState(String(row.percent));
  const [minFee, setMinFee] = useState(String(row.min_fee));
  const [notes, setNotes] = useState(row.notes ?? "");
  const [active, setActive] = useState(row.active);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const service = services.find((s) => s.slug === row.category);
  const Icon = service?.icon;
  const projected = volume ? (volume.revenue * Number(percent || 0)) / 100 + volume.count * Number(minFee || 0) : 0;

  const dirty =
    String(row.percent) !== percent ||
    String(row.min_fee) !== minFee ||
    (row.notes ?? "") !== notes ||
    row.active !== active;

  const validPercent = Number(percent) >= 0 && Number(percent) <= 100;
  const validMin = Number(minFee) >= 0;

  return (
    <div className={`rounded-2xl border bg-card p-4 ${active ? "border-border" : "border-border/40 opacity-70"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            {Icon ? <Icon className="size-5 text-primary" /> : <Wallet className="size-5 text-primary" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium capitalize">{service?.name ?? row.category}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${active ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                {active ? "Active" : "Paused"}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {volume ? `${volume.count} completed · $${volume.revenue.toFixed(0)} revenue` : "No completed bookings yet"}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Projected fees</div>
          <div className="text-lg font-semibold">${projected.toFixed(2)}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-12">
        <Field label="Commission %" className="sm:col-span-3">
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              className={`w-full rounded-lg border bg-background px-3 py-2 pr-8 text-sm ${validPercent ? "border-input" : "border-destructive"}`}
            />
            <Percent className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </Field>
        <Field label="Min fee ($/booking)" className="sm:col-span-3">
          <input
            type="number"
            step="0.5"
            min={0}
            value={minFee}
            onChange={(e) => setMinFee(e.target.value)}
            className={`w-full rounded-lg border bg-background px-3 py-2 text-sm ${validMin ? "border-input" : "border-destructive"}`}
          />
        </Field>
        <Field label="Notes (internal)" className="sm:col-span-6">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. promo rate Q1"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setActive((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          {active ? <><PowerOff className="size-3" /> Pause</> : <><Power className="size-3" /> Activate</>}
        </button>

        <div className="flex flex-wrap gap-2">
          {confirmDelete ? (
            <>
              <button onClick={() => { onDelete(); setConfirmDelete(false); }} className="inline-flex items-center gap-1 rounded-full bg-destructive px-3 py-1.5 text-xs text-background">
                Confirm delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="rounded-full border border-border px-3 py-1.5 text-xs">Cancel</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1 rounded-full border border-destructive/50 px-3 py-1.5 text-xs text-destructive">
              <Trash2 className="size-3" /> Remove
            </button>
          )}
          <button
            onClick={() => validPercent && validMin && onSave({ percent: Number(percent), min_fee: Number(minFee), notes: notes || null, active })}
            disabled={!dirty || !validPercent || !validMin || saving}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            <Save className="size-3" /> {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddRateCard({
  availableCategories,
  onAdd,
  saving,
}: {
  availableCategories: string[];
  onAdd: (row: { category: string; percent: number; min_fee: number; notes: string | null; active: boolean }) => void;
  saving: boolean;
}) {
  const [category, setCategory] = useState(availableCategories[0] ?? "");
  const [percent, setPercent] = useState("10");
  const [minFee, setMinFee] = useState("0");
  const [notes, setNotes] = useState("");

  const canSave = category && Number(percent) >= 0 && Number(percent) <= 100 && Number(minFee) >= 0;

  if (availableCategories.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/50 p-4">
      <h3 className="text-sm font-semibold">Add new rate</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-12">
        <Field label="Service category" className="sm:col-span-4">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm capitalize"
          >
            {availableCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Commission %" className="sm:col-span-2">
          <input
            type="number" step="0.1" min={0} max={100}
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Min fee" className="sm:col-span-2">
          <input
            type="number" step="0.5" min={0}
            value={minFee}
            onChange={(e) => setMinFee(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Notes (internal)" className="sm:col-span-4">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </Field>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => canSave && onAdd({ category, percent: Number(percent), min_fee: Number(minFee), notes: notes || null, active: true })}
          disabled={!canSave || saving}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-40"
        >
          <Plus className="size-3" /> {saving ? "Adding…" : "Add rate"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`grid gap-1 ${className}`}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function avg(rows: Row[]) {
  if (!rows.length) return 0;
  return rows.reduce((s, r) => s + Number(r.percent), 0) / rows.length;
}
