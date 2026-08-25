import { describe, expect, it } from "vitest";
import {
  formatPhoneNumber,
  isValidPhoneNumber,
  normalisePhoneNumber,
  syntheticPhoneEmail,
  toCanonicalPhone,
} from "@/lib/phone";

describe("Zimbabwe phone normalisation", () => {
  it("maps every local spelling of one number to a single canonical form", () => {
    const forms = ["0771234567", "077 123 4567", "+263771234567", "263771234567", "771234567", "+263 77 123-4567"];
    const canonical = forms.map((f) => normalisePhoneNumber(f));
    expect(new Set(canonical).size).toBe(1);
    expect(canonical[0]).toBe("+263771234567");
  });

  it("rejects malformed or non-existent Zimbabwe prefixes", () => {
    expect(isValidPhoneNumber(normalisePhoneNumber("+263991234567"))).toBe(false);
    expect(isValidPhoneNumber(normalisePhoneNumber("07712345"))).toBe(false);
    expect(isValidPhoneNumber(normalisePhoneNumber("not a phone"))).toBe(false);
    expect(toCanonicalPhone("")).toBeNull();
  });

  it("accepts other plausible international numbers", () => {
    expect(toCanonicalPhone("+27 82 123 4567")).toBe("+27821234567");
  });

  it("formats and derives a deterministic identity email", () => {
    expect(formatPhoneNumber("+263771234567")).toBe("+263 77 123 4567");
    expect(syntheticPhoneEmail("+263771234567")).toBe("263771234567@phone.zwits.co.zw");
    expect(syntheticPhoneEmail(toCanonicalPhone("0771234567")!)).toBe(
      syntheticPhoneEmail(toCanonicalPhone("+263771234567")!),
    );
  });
});
