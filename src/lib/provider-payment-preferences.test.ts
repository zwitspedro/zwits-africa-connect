import { describe, expect, it } from "vitest";
import { canSelectProviderPaymentPreference } from "./provider-payment-preferences";

describe("provider payment availability", () => {
  it("allows cash pickup", () => expect(canSelectProviderPaymentPreference("cash")).toBe(true));
  it.each(["bank", "ecocash", "innbucks", "mukuru"])("keeps %s unavailable", (method) => {
    expect(canSelectProviderPaymentPreference(method)).toBe(false);
  });
});