import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Grants the signed-in account a portal role and makes sure a profile exists.
 * The client can only *request* a role — the server decides what is allowed,
 * and no role here implies provider verification.
 */
export const claimRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { role: string; displayName?: string; phone?: string }) => input)
  .handler(async ({ data, context }) => {
    const { bootstrapAccount, isClaimableRole, ensureProfile, listRoles } = await import(
      "@/lib/auth-onboarding.server"
    );

    if (!isClaimableRole(data.role)) {
      await ensureProfile(context.userId);
      return { roles: await listRoles(context.userId) };
    }

    const roles = await bootstrapAccount(context.userId, data.role, {
      display_name: data.displayName ?? null,
      phone: data.phone ?? null,
    });
    return { roles };
  });

/** Authoritative role list for the signed-in account. */
export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { ensureProfile, listRoles } = await import("@/lib/auth-onboarding.server");
    await ensureProfile(context.userId);
    return { roles: await listRoles(context.userId) };
  });
