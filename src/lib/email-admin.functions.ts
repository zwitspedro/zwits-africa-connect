import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EmailLogRow = {
  id: string;
  created_at: string;
  recipient_email: string;
  template_name: string;
  status: string;
  error_message: string | null;
  message_id: string | null;
};

export type EmailDiagnostics = {
  log: EmailLogRow[];
  suppressed: { email: string; reason: string | null; created_at: string }[];
};

/**
 * Admin-only view of email delivery state. The email tables are service-role
 * only by design, so the caller's admin role is verified before elevating.
 */
export const getEmailDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EmailDiagnostics> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("email_send_log")
      .select("id,created_at,recipient_email,template_name,status,error_message,message_id")
      .order("created_at", { ascending: false })
      .limit(400);
    if (error) throw new Error(error.message);

    // One email writes several rows sharing a message_id — keep the newest.
    const seen = new Set<string>();
    const log = (rows ?? []).filter((r) => {
      const key = r.message_id ?? r.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }) as EmailLogRow[];

    const { data: suppressed } = await supabaseAdmin
      .from("suppressed_emails")
      .select("email,reason,created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    return { log, suppressed: (suppressed ?? []) as EmailDiagnostics["suppressed"] };
  });
