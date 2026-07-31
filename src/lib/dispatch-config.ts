/** Shared, client-safe dispatch configuration. */

export type FulfilmentMode = "dispatch" | "quotes";

/** Services where the customer compares offers instead of first-come-first-served. */
const QUOTE_CATEGORIES = new Set([
  "repairs",
  "cleaning",
  "farming",
  "beauty",
  "freelance",
  "painting",
  "carpentry",
  "welding",
  "solar",
  "borehole",
  "moving",
  "gardening",
  "security",
  "tutors",
  "it-services",
  "appliance-repairs",
  "wifi-installation",
]);

/** Fast-dispatch services with a tight accept window (Uber-style). */
const FAST_CATEGORIES = new Set(["deliveries", "transport", "emergency"]);

export function fulfilmentModeFor(category: string): FulfilmentMode {
  return QUOTE_CATEGORIES.has(category) ? "quotes" : "dispatch";
}

/** Seconds a provider has to respond to an offer. */
export function offerWindowSeconds(category: string): number {
  if (FAST_CATEGORIES.has(category)) return 20;
  return 30;
}

/** How many providers get offered the job per wave. */
export const WAVE_SIZE = 10;

/** How many waves before we give up. */
export const MAX_WAVES = 4;

/** Max quotes collected before the customer must choose. */
export const MAX_QUOTES = 5;

export const DISPATCH_STATE_LABELS: Record<string, string> = {
  idle: "Not dispatched",
  dispatching: "Finding a provider",
  assigned: "Provider assigned",
  collecting_quotes: "Collecting quotes",
  no_providers: "No providers available",
  cancelled: "Cancelled",
};
