export const PROVIDER_PAYMENT_PREFERENCES = [
  { key: "cash", label: "Cash pickup", available: true },
  { key: "bank", label: "Bank transfer", available: false },
  { key: "ecocash", label: "EcoCash", available: false },
  { key: "innbucks", label: "InnBucks", available: false },
  { key: "mukuru", label: "Mukuru", available: false },
] as const;

export function canSelectProviderPaymentPreference(method: string) {
  return PROVIDER_PAYMENT_PREFERENCES.some((option) => option.key === method && option.available);
}