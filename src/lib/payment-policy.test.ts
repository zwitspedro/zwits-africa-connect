import { describe, expect, it } from "vitest";
import { activePaymentMethodSchema } from "./payment-policy";

describe("cash-only payment policy", () => {
  it("accepts cash", () => expect(activePaymentMethodSchema.parse("cash")).toBe("cash"));
  it.each(["ecocash", "innbucks", "zipit", "mukuru", "bank_transfer", "onemoney", "card"])(
    "rejects %s payments", (method) => expect(activePaymentMethodSchema.safeParse(method).success).toBe(false),
  );
});