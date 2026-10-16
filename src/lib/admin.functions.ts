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
    const {data: result, error} = await context.supabase.rpc("admin_review_provider", {
      _id: data.providerId, _status: data.status, _reason: data.reason ?? "",
    });
    if (error) throw new Error(error.message);
    return result as {ok: true; status: string};
  });
