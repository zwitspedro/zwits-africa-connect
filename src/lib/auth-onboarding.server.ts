/**
 * Server-authoritative account bootstrap.
 *
 * Roles are granted here — never by the browser. `provider`, `driver` and
 * `business` are no longer self-insertable through RLS, so this is the single
 * place where an account gains a portal. Granting a role NEVER implies
 * verification: providers still go through the existing verification engine.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AppRole } from "@/lib/roles";

/** Roles a person may obtain for themselves by completing a sign-up flow. */
export const SELF_CLAIMABLE_ROLES = ["customer", "provider", "driver", "business"] as const;
export type ClaimableRole = (typeof SELF_CLAIMABLE_ROLES)[number];

export function isClaimableRole(role: string): role is ClaimableRole {
  return (SELF_CLAIMABLE_ROLES as readonly string[]).includes(role);
}

/** Creates the profile row if it is missing. Safe to call on every sign-in. */
export async function ensureProfile(
  userId: string,
  fields: { display_name?: string | null; phone?: string | null } = {},
) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("user_id, display_name, phone")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    await supabaseAdmin.from("profiles").insert({
      user_id: userId,
      display_name: fields.display_name ?? null,
      phone: fields.phone ?? null,
      country: "Zimbabwe",
    });
    return;
  }

  const patch: { display_name?: string; phone?: string } = {};
  if (!data.display_name && fields.display_name) patch.display_name = fields.display_name;
  if (!data.phone && fields.phone) patch.phone = fields.phone;
  if (Object.keys(patch).length) {
    await supabaseAdmin.from("profiles").update(patch).eq("user_id", userId);
  }
}

/** Grants a role (idempotent) and returns every role the account now holds. */
export async function grantRole(userId: string, role: ClaimableRole): Promise<AppRole[]> {
  await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
  return listRoles(userId);
}

export async function listRoles(userId: string): Promise<AppRole[]> {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as AppRole);
  return roles.length ? roles : ["customer"];
}

/**
 * Full bootstrap used by every authentication path (OAuth, email, OTP):
 * profile row + requested role, with `customer` as the always-present floor.
 */
export async function bootstrapAccount(
  userId: string,
  role: ClaimableRole,
  fields: { display_name?: string | null; phone?: string | null } = {},
): Promise<AppRole[]> {
  await ensureProfile(userId, fields);
  if (role !== "customer") await grantRole(userId, "customer");
  return grantRole(userId, role);
}
