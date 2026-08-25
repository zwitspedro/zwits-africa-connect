/**
 * Server-only helpers for phone OTP authentication and auth rate limiting.
 * Never imported from client code.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;

/** SHA-256 of code + a server-only pepper. Plaintext codes are never stored. */
export async function hashOtp(phone: string, code: string): Promise<string> {
  const pepper = process.env["OTP_PEPPER"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
  const bytes = new TextEncoder().encode(`${phone}:${code}:${pepper}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateOtp(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000;
  return n.toString().padStart(6, "0");
}

/** Constant-time-ish comparison of two hex digests. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Fixed-window counter shared by every abuse-prone auth action
 * (OTP send/verify, confirmation resend, password reset).
 * Returns false when the caller is over budget.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const now = new Date();
  const { data } = await supabaseAdmin
    .from("auth_rate_limits")
    .select("key, window_start, count")
    .eq("key", key)
    .maybeSingle();

  const windowStart = data?.window_start ? new Date(data.window_start) : null;
  const fresh = !windowStart || now.getTime() - windowStart.getTime() > windowSeconds * 1000;

  if (fresh) {
    await supabaseAdmin
      .from("auth_rate_limits")
      .upsert({ key, window_start: now.toISOString(), count: 1, updated_at: now.toISOString() });
    return true;
  }

  if ((data?.count ?? 0) >= limit) return false;

  await supabaseAdmin
    .from("auth_rate_limits")
    .update({ count: (data?.count ?? 0) + 1, updated_at: now.toISOString() })
    .eq("key", key);
  return true;
}
