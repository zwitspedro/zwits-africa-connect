import { createServerFn } from "@tanstack/react-start";

/** Phone sign-in is unavailable until SMS delivery is ready. */
export const requestPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string }) => input)
  .handler(async () => ({ ok: false as const, error: "sms_not_configured" }));

/** Reject old codes too: hiding the phone form must not leave a login path open. */
export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; code: string; role?: string }) => input)
  .handler(async () => ({ ok: false as const, error: "sms_not_configured" }));
