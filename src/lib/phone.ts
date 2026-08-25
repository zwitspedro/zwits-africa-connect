/**
 * Zimbabwe-first phone number handling.
 *
 * Every entry point (login, signup, OTP) must store and look up exactly one
 * canonical representation so `077...`, `26377...` and `+26377...` never
 * create three different accounts.
 */

/** Canonical form is E.164 without spaces: +263771234567 */
export function normalisePhoneNumber(raw: string): string | null {
  const trimmed = (raw ?? "").replace(/[\s()\-.]/g, "");
  if (!trimmed) return null;

  let digits = trimmed.replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;

  // Local Zimbabwe formats: 0771234567 -> 263771234567
  if (digits.startsWith("0")) digits = `263${digits.replace(/^0+/, "")}`;
  // Bare national number: 771234567 -> 263771234567
  else if (digits.length === 9 && /^[17]/.test(digits)) digits = `263${digits}`;

  return `+${digits}`;
}

/**
 * Validates a canonical number. Zimbabwe numbers are checked strictly
 * (mobile prefixes 71/73/77/78 plus 9 digits); other countries only need to
 * look like a plausible E.164 number.
 */
export function isValidPhoneNumber(canonical: string | null): canonical is string {
  if (!canonical) return false;
  if (!/^\+\d{8,15}$/.test(canonical)) return false;
  if (canonical.startsWith("+263")) return /^\+263(71|73|77|78)\d{7}$/.test(canonical);
  return true;
}

/** Normalises and validates in one step; returns null when unusable. */
export function toCanonicalPhone(raw: string): string | null {
  const canonical = normalisePhoneNumber(raw);
  return isValidPhoneNumber(canonical) ? canonical : null;
}

/** Pretty display form: +263 77 123 4567 */
export function formatPhoneNumber(canonical: string): string {
  if (!/^\+263\d{9}$/.test(canonical)) return canonical;
  const n = canonical.slice(4);
  return `+263 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;
}

/** Deterministic identity email for phone-only accounts. */
export function syntheticPhoneEmail(canonical: string): string {
  return `${canonical.replace(/^\+/, "")}@phone.zwits.co.zw`;
}
