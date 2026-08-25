import { createServerFn } from "@tanstack/react-start";
import { toCanonicalPhone, syntheticPhoneEmail } from "@/lib/phone";

/**
 * Phone (SMS) one-time-passcode authentication.
 *
 * Codes are hashed before storage, single-use, short-lived, attempt-capped and
 * rate limited. The code is NEVER returned to the client. On success the
 * server mints a one-shot login token so the browser can establish a session
 * without ever handling the passcode secret material.
 */

export const requestPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string }) => input)
  .handler(async ({ data }) => {
    const phone = toCanonicalPhone(data.phone);
    if (!phone) return { ok: false as const, error: "invalid_phone" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      consumeRateLimit,
      generateOtp,
      hashOtp,
      OTP_TTL_SECONDS,
      OTP_RESEND_COOLDOWN_SECONDS,
    } = await import("@/lib/auth-otp.server");
    const { getSmsProvider } = await import("@/lib/sms.server");

    if (!(await consumeRateLimit(`otp:cooldown:${phone}`, 1, OTP_RESEND_COOLDOWN_SECONDS))) {
      return { ok: false as const, error: "cooldown", retryAfter: OTP_RESEND_COOLDOWN_SECONDS };
    }
    if (!(await consumeRateLimit(`otp:hourly:${phone}`, 5, 3600))) {
      return { ok: false as const, error: "rate_limited" };
    }

    // Invalidate any outstanding code for this number: one live code at a time.
    await supabaseAdmin
      .from("auth_otp_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("phone", phone)
      .is("consumed_at", null);

    const code = generateOtp();
    const sms = await getSmsProvider().send(
      phone,
      `${code} is your Zwits verification code. It expires in 5 minutes. Never share it.`,
    );

    const { error } = await supabaseAdmin.from("auth_otp_codes").insert({
      phone,
      code_hash: await hashOtp(phone, code),
      expires_at: new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString(),
      delivery_channel: sms.channel,
      delivered: sms.delivered,
    });
    if (error) {
      console.error("[otp] could not persist code", error);
      return { ok: false as const, error: "server_error" };
    }

    if (!sms.delivered) {
      console.error(`[otp] delivery failed for ${phone}: ${sms.reason} via ${sms.channel}`);
      return { ok: false as const, error: sms.reason };
    }
    return { ok: true as const, expiresIn: OTP_TTL_SECONDS, cooldown: OTP_RESEND_COOLDOWN_SECONDS };
  });

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; code: string; role?: string }) => input)
  .handler(async ({ data }) => {
    const phone = toCanonicalPhone(data.phone);
    if (!phone || !/^\d{6}$/.test(data.code ?? "")) {
      return { ok: false as const, error: "invalid_code" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { consumeRateLimit, hashOtp, timingSafeEqualHex } = await import("@/lib/auth-otp.server");
    const { bootstrapAccount, isClaimableRole } = await import("@/lib/auth-onboarding.server");

    if (!(await consumeRateLimit(`otp:verify:${phone}`, 10, 900))) {
      return { ok: false as const, error: "too_many_attempts" };
    }

    const { data: row } = await supabaseAdmin
      .from("auth_otp_codes")
      .select("id, code_hash, attempts, max_attempts, expires_at, consumed_at")
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return { ok: false as const, error: "no_active_code" };
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false as const, error: "expired" };
    }
    if (row.attempts >= row.max_attempts) {
      await supabaseAdmin
        .from("auth_otp_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", row.id);
      return { ok: false as const, error: "too_many_attempts" };
    }

    if (!timingSafeEqualHex(row.code_hash, await hashOtp(phone, data.code))) {
      await supabaseAdmin
        .from("auth_otp_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      return { ok: false as const, error: "invalid_code" };
    }

    // Single use: burn it before anything else can replay it.
    await supabaseAdmin
      .from("auth_otp_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("consumed_at", null);

    // Existing account with this number wins, so we never fork identities.
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("phone", phone)
      .maybeSingle();

    let email: string | null = null;
    let userId: string | null = null;

    if (existingProfile?.user_id) {
      const { data: found } = await supabaseAdmin.auth.admin.getUserById(existingProfile.user_id);
      if (found?.user?.email) {
        userId = found.user.id;
        email = found.user.email;
      }
    }

    if (!email) {
      email = syntheticPhoneEmail(phone);
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        phone,
        email_confirm: true,
        phone_confirm: true,
      });
      if (created.data?.user) userId = created.data.user.id;
      else if (!/already|registered|exists/i.test(created.error?.message ?? "")) {
        console.error("[otp] user creation failed", created.error);
        return { ok: false as const, error: "server_error" };
      }
    }

    const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error || !link.data?.properties?.hashed_token) {
      console.error("[otp] could not mint session token", link.error);
      return { ok: false as const, error: "server_error" };
    }
    userId = userId ?? link.data.user?.id ?? null;

    if (userId) {
      const role = data.role && isClaimableRole(data.role) ? data.role : "customer";
      await bootstrapAccount(userId, role, { phone });
    }

    return { ok: true as const, tokenHash: link.data.properties.hashed_token };
  });
