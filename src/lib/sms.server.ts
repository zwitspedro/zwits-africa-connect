/**
 * SMS provider abstraction.
 *
 * The authentication layer never talks to a gateway directly — it asks this
 * registry for the configured provider. A Zimbabwean gateway (Econet Bulk SMS,
 * Twilio, BulkSMS, etc.) can be added later by implementing `SmsProvider` and
 * registering it here; no auth code changes.
 */

export type SmsResult =
  | { delivered: true; channel: string; providerRef?: string }
  | { delivered: false; channel: string; reason: string };

export type SmsProvider = {
  name: string;
  send(to: string, message: string): Promise<SmsResult>;
};

/**
 * Fallback used while no gateway is connected. It deliberately reports
 * `delivered: false` so the UI can tell the truth instead of pretending an
 * SMS went out.
 */
const unconfiguredProvider: SmsProvider = {
  name: "unconfigured",
  async send(to) {
    console.warn(`[sms] no gateway configured — message for ${to} was not sent`);
    return { delivered: false, channel: "unconfigured", reason: "sms_not_configured" };
  },
};

/** Generic HTTP gateway: works with most Zimbabwean bulk-SMS REST endpoints. */
function httpProvider(): SmsProvider | null {
  const url = process.env["SMS_GATEWAY_URL"];
  const key = process.env["SMS_GATEWAY_API_KEY"];
  const sender = process.env["SMS_SENDER_ID"] ?? "ZWITS";
  if (!url || !key) return null;

  return {
    name: "http-gateway",
    async send(to, message) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
          body: JSON.stringify({ to, message, from: sender }),
        });
        if (!res.ok) {
          console.error(`[sms] gateway ${res.status}: ${await res.text()}`);
          return { delivered: false, channel: "http-gateway", reason: "gateway_error" };
        }
        return { delivered: true, channel: "http-gateway" };
      } catch (e) {
        console.error("[sms] gateway request failed", e);
        return { delivered: false, channel: "http-gateway", reason: "gateway_unreachable" };
      }
    },
  };
}

export function getSmsProvider(): SmsProvider {
  return httpProvider() ?? unconfiguredProvider;
}
