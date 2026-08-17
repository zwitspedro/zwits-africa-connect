import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Mail } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/portal/role-gate";

export const Route = createFileRoute("/_authenticated/admin/email")({
  head: () => ({
    meta: [
      { title: "Email delivery diagnostics — Zwits admin" },
      { name: "description", content: "Monitor Zwits confirmation and transactional email delivery, failures and suppressions." },
      { property: "og:title", content: "Email delivery diagnostics — Zwits admin" },
      { property: "og:description", content: "Monitor Zwits email delivery, failures and suppressions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGate role="admin">
      <EmailDiagnostics />
    </RoleGate>
  ),
});

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-emerald-500/12 text-emerald-600",
  queued: "bg-amber-500/12 text-amber-600",
  failed: "bg-destructive/12 text-destructive",
  dlq: "bg-destructive/12 text-destructive",
};

function EmailDiagnostics() {
  const { data: log, isLoading, error } = useQuery({
    queryKey: ["admin-email-log"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_send_log")
        .select("id,created_at,recipient_email,template_name,status,error_message,message_id")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: suppressed } = useQuery({
    queryKey: ["admin-email-suppressed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppressed_emails")
        .select("email,reason,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return [];
      return data ?? [];
    },
  });

  const rows = log ?? [];
  const sent = rows.filter((r) => r.status === "sent").length;
  const failed = rows.filter((r) => r.status === "failed" || r.status === "dlq").length;
  const queued = rows.length - sent - failed;

  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Admin
        </Link>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Email delivery</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Live send state for confirmation and transactional emails. Credentials are never stored here.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat icon={CheckCircle2} label="Sent" value={sent} />
          <Stat icon={Clock} label="Queued / retrying" value={queued} />
          <Stat icon={AlertTriangle} label="Failed" value={failed} />
        </div>

        {error && (
          <p className="mt-6 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
            Could not read the email log: {(error as Error).message}
          </p>
        )}

        <div className="mt-8 overflow-hidden rounded-3xl border border-border/70">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={4} className="px-4 py-6 text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                    No email activity recorded yet.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/60 align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{r.recipient_email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.template_name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[r.status] ?? "bg-muted text-muted-foreground"}`}>
                      {r.status}
                    </span>
                    {r.error_message && (
                      <p className="mt-1 max-w-sm text-xs text-destructive">{r.error_message}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(suppressed?.length ?? 0) > 0 && (
          <div className="mt-8">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <Mail className="size-4" /> Suppressed addresses
            </h2>
            <ul className="mt-3 grid gap-1.5 text-sm">
              {suppressed!.map((s) => (
                <li key={s.email} className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-2.5">
                  <span>{s.email}</span>
                  <span className="text-xs text-muted-foreground">{s.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SiteShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card/60 p-5">
      <Icon className="size-5 text-primary" />
      <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
