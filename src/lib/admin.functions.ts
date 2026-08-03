import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VerificationSchema = z.object({
  providerId: z.string().uuid(),
  status: z.enum(["approved", "revoked", "pending"]),
  reason: z.string().max(500).optional().nullable(),
});

/**
 * Admin-only provider verification. The caller's identity comes from the
 * validated bearer token; the admin role is re-checked server-side against the
 * roles table, so hiding the button in the UI is never the security boundary.
 */
export const setProviderVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => VerificationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError) throw new Error("Could not verify permissions");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: provider, error: findError } = await supabaseAdmin
      .from("providers")
      .select("id, user_id, business_name, verification_status")
      .eq("id", data.providerId)
      .maybeSingle();
    if (findError) throw new Error(findError.message);
    if (!provider) throw new Error("Provider not found");

    const patch: Record<string, unknown> = {
      verification_status: data.status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: context.userId,
    };
    if (data.status === "approved") {
      patch.verified = true;
      patch.available = true;
      patch.revoke_reason = null;
    } else if (data.status === "revoked") {
      patch.verified = false;
      patch.available = false;
      patch.revoke_reason = data.reason?.trim() || "Verification revoked by admin";
    } else {
      patch.verified = false;
      patch.revoke_reason = null;
    }

    const { error: updateError } = await supabaseAdmin
      .from("providers")
      .update(patch)
      .eq("id", provider.id);
    if (updateError) throw new Error(updateError.message);

    // Audit trail of the review decision.
    await supabaseAdmin.from("provider_document_audits").insert({
      provider_user_id: provider.user_id,
      doc_key: "verification_review",
      status: data.status,
      errors: data.status === "revoked" && data.reason ? [data.reason] : [],
      file_name: `reviewed_by:${context.userId}`,
    });

    await supabaseAdmin.from("notifications").insert({
      user_id: provider.user_id,
      title:
        data.status === "approved"
          ? "You're verified"
          : data.status === "revoked"
            ? "Verification revoked"
            : "Verification under review",
      body:
        data.status === "approved"
          ? "Your provider account has been approved. You can go online and receive jobs."
          : data.status === "revoked"
            ? patch.revoke_reason as string
            : "An admin is reviewing your documents.",
      link: "/provider",
      kind: `verification_${data.status}`,
    });

    return { ok: true, status: data.status };
  });
