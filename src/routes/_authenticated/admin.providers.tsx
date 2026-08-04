import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldX, FileText, History } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { AuditExportButtons } from "@/components/audit-export-buttons";
import { supabase } from "@/integrations/supabase/client";
import { PROVIDER_SAFE_COLUMNS, fetchProviderDocuments } from "@/lib/provider-columns";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { setProviderVerification } from "@/lib/admin.functions";
import { RoleGate } from "@/components/portal/role-gate";

export const Route = createFileRoute("/_authenticated/admin/providers")({
  head: () => ({ meta: [{ title: "Admin — Providers — Zwits" }] }),
  component: AdminAdminProvidersRoute,
});

function AdminProviders() {
  const { user } = useAuth();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const qc = useQueryClient();
  const isAdmin = (roles ?? []).includes("admin");

  const { data: providers, isLoading } = useQuery({
    queryKey: ["admin-providers"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select(PROVIDER_SAFE_COLUMNS)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: "approved" | "revoked"; reason?: string }) => {
      // Server-side admin authorization — never a client-side role check.
      await setProviderVerification({ data: { providerId: id, status, reason: reason ?? null } });
    },
    onSuccess: () => {
      toast.success("Provider updated");
      qc.invalidateQueries({ queryKey: ["admin-providers"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });
  const { data: allAudits } = useQuery({
    queryKey: ["admin-all-audits"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_document_audits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data;
    },
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


  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Provider verification</h1>
            <p className="mt-2 text-sm text-muted-foreground">Review documents and manage verification status.</p>
          </div>
          <AuditExportButtons
            rows={allAudits as any}
            filenameBase="all-provider-audits"
            pdfTitle="All provider document audits"
            pdfSubtitle={`${allAudits?.length ?? 0} entries across all providers`}
            size="sm"
          />
        </div>

        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading providers…</p>}

        <ul className="mt-6 grid gap-3">
          {(providers ?? []).map((p) => (
            <AdminProviderRow
              key={p.id}
              provider={p}
              onApprove={() => setStatus.mutate({ id: p.id, status: "approved" })}
              onRevoke={(reason) => setStatus.mutate({ id: p.id, status: "revoked", reason })}
            />
          ))}
          {(providers ?? []).length === 0 && !isLoading && (
            <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No providers yet.</li>
          )}
        </ul>
      </section>
    </SiteShell>
  );
}

function AdminProviderRow({ provider, onApprove, onRevoke }: { provider: any; onApprove: () => void; onRevoke: (reason: string) => void }) {
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [reason, setReason] = useState("");
  const [showAudit, setShowAudit] = useState(false);

  const status = provider.verification_status as string;
  const statusColor = status === "approved" ? "text-emerald-400 bg-emerald-500/15"
    : status === "revoked" ? "text-destructive bg-destructive/15"
    : "text-muted-foreground bg-muted";

  // Admins read document paths through the authorized RPC, not the table.
  const { data: docs } = useQuery({
    queryKey: ["admin-provider-docs", provider.id],
    queryFn: () => fetchProviderDocuments(provider.id),
  });

  const { data: audits } = useQuery({
    queryKey: ["admin-provider-audits", provider.user_id],
    enabled: showAudit,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_document_audits")
        .select("*")
        .eq("provider_user_id", provider.user_id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{provider.business_name}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusColor}`}>{status}</span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{provider.category} · {provider.city} · ${Number(provider.hourly_rate).toFixed(0)}/hr</div>
          {provider.revoke_reason && <div className="mt-1 text-xs text-destructive">Reason: {provider.revoke_reason}</div>}
        </div>
        <div className="flex gap-2">
          {status !== "approved" && (
            <button onClick={onApprove} className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs text-background">
              <ShieldCheck className="size-3" /> Approve
            </button>
          )}
          {status !== "revoked" && (
            <button onClick={() => setConfirmRevoke((v) => !v)} className="inline-flex items-center gap-1 rounded-full border border-destructive/50 px-3 py-1.5 text-xs text-destructive">
              <ShieldX className="size-3" /> Revoke
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <DocLink path={docs?.id_document_url ?? null} label="ID" />
        <DocLink path={docs?.selfie_url ?? null} label="Selfie" />
        <DocLink path={docs?.business_doc_url ?? null} label="Business doc" />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <button
          type="button"
          onClick={() => setShowAudit((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <History className="size-3" /> {showAudit ? "Hide" : "View"} audit history{audits?.length ? ` (${audits.length})` : ""}
        </button>
        {showAudit && (
          <AuditExportButtons
            rows={audits as any}
            filenameBase={`audit-${provider.business_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
            pdfTitle={`Document audit — ${provider.business_name}`}
            pdfSubtitle={`Provider user ${provider.user_id} · status ${status}`}
          />
        )}
      </div>

      {showAudit && (
        <div className="mt-2 max-h-72 overflow-auto rounded-xl bg-muted/30 p-3 text-[11px]">
          {!audits?.length && <span className="text-muted-foreground">No upload attempts recorded.</span>}
          <ul className="grid gap-1.5">
            {audits?.map((a: any) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background/50 px-2 py-1.5">
                <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                <span className="font-medium">{a.doc_key}</span>
                <span className={a.status === "uploaded" ? "text-emerald-400" : a.status === "rejected" || a.status === "upload_error" ? "text-destructive" : "text-muted-foreground"}>{a.status}</span>
                <span className="truncate text-muted-foreground">{a.file_name ?? "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirmRevoke && (
        <div className="mt-3 grid gap-2 rounded-xl bg-muted/40 p-3">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (shown to provider)"
            className="rounded-lg border border-input bg-background px-3 py-2 text-xs"
          />
          <div className="flex gap-2">
            <button onClick={() => { onRevoke(reason || "Verification revoked"); setConfirmRevoke(false); setReason(""); }}
              className="rounded-full bg-destructive px-3 py-1.5 text-xs text-background">Confirm revoke</button>
            <button onClick={() => setConfirmRevoke(false)} className="rounded-full border border-border px-3 py-1.5 text-xs">Cancel</button>
          </div>
        </div>
      )}
    </li>
  );
}

function DocLink({ path, label }: { path: string | null; label: string }) {
  const { data } = useQuery({
    queryKey: ["admin-doc", path],
    enabled: !!path,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("provider-verification").createSignedUrl(path!, 60 * 10);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  if (!path) return <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">{label}: missing</span>;
  return (
    <a href={data ?? "#"} target="_blank" rel="noreferrer"
       className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-[11px] text-primary hover:bg-primary/25">
      <FileText className="size-3" /> {label}
    </a>
  );
}

function AdminAdminProvidersRoute() {
  return (
    <RoleGate role="admin">
      <AdminProviders />
    </RoleGate>
  );
}
