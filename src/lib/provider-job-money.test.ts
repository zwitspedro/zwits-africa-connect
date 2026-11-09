import { describe, it, expect } from "vitest";
import { estimateCommission } from "./provider-job-money";
describe("provider job commission", () => {
  it("charges $10 on a $100 job at the published 10%", () => expect(estimateCommission(100, { percent: 10, min_fee: 0 })).toBe(10));
  it("uses the minimum as a floor, not an added charge", () => expect(estimateCommission(100, { percent: 10, min_fee: 5 })).toBe(10));
  it("caps commission at the configured maximum", () => expect(estimateCommission(100, { percent: 10, min_fee: 0, max_fee: 8 })).toBe(8));
});