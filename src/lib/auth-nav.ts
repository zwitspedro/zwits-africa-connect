import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_ROLE_KEY, ROLES, pickDefaultRole, type AppRole } from "@/lib/roles";

export const REMEMBERED_EMAIL_KEY = "zwits.rememberedEmail";

export async function fetchRoles(userId: string): Promise<AppRole[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as AppRole);
  return roles.length ? roles : (["customer"] as AppRole[]);
}

/**
 * Where a user lands after signing in.
 * - multiple workspaces → workspace picker (unless a remembered workspace is still valid)
 * - single workspace → straight into that portal
 */
export async function resolveLanding(userId: string, preferred?: AppRole): Promise<string> {
  const roles = await fetchRoles(userId);

  if (preferred && roles.includes(preferred)) {
    localStorage.setItem(ACTIVE_ROLE_KEY, preferred);
    return ROLES[preferred].home;
  }

  if (roles.length > 1) {
    const remembered = localStorage.getItem(ACTIVE_ROLE_KEY) as AppRole | null;
    if (remembered && roles.includes(remembered)) return ROLES[remembered].home;
    return "/workspace";
  }

  const only = pickDefaultRole(roles);
  localStorage.setItem(ACTIVE_ROLE_KEY, only);
  return ROLES[only].home;
}

/** Accepts an email or a phone number in the same field. */
export function isPhoneIdentifier(value: string) {
  return /^\+?[0-9\s()-]{7,}$/.test(value.trim());
}

export function normalisePhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits.replace(/^0+/, "263")}`;
}
