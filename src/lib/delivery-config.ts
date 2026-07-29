/** Shared, client-safe delivery configuration. */

export type ServiceTier = "express_bike" | "standard_van" | "business_courier";
export type ParcelSize = "small" | "medium" | "large";

export const TIERS: Record<
  ServiceTier,
  { label: string; blurb: string; base: number; perKm: number; maxKg: number }
> = {
  express_bike: {
    label: "Express bike",
    blurb: "Documents and parcels under 10kg, picked up within 20 minutes.",
    base: 3,
    perKm: 0.55,
    maxKg: 10,
  },
  standard_van: {
    label: "Standard van",
    blurb: "Boxes, groceries and bulk shop orders across the city.",
    base: 12,
    perKm: 0.9,
    maxKg: 500,
  },
  business_courier: {
    label: "Business courier",
    blurb: "Scheduled runs, bulk drops and monthly invoicing.",
    base: 20,
    perKm: 0.8,
    maxKg: 1000,
  },
};

export const PARCEL_SIZES: Record<ParcelSize, { label: string; hint: string; multiplier: number }> = {
  small: { label: "Small", hint: "Envelope, phone, keys", multiplier: 1 },
  medium: { label: "Medium", hint: "Backpack, groceries", multiplier: 1.15 },
  large: { label: "Large", hint: "Boxes, appliances", multiplier: 1.4 },
};

export function quotePrice(tier: ServiceTier, size: ParcelSize, distanceKm: number | null) {
  const t = TIERS[tier];
  const km = distanceKm == null || Number.isNaN(distanceKm) ? 5 : Math.max(1, distanceKm);
  const raw = (t.base + t.perKm * km) * PARCEL_SIZES[size].multiplier;
  return Math.round(raw * 100) / 100;
}

/** Straight-line distance in km — good enough for an instant estimate. */
export function haversineKm(
  a: { lat: number; lng: number } | null,
  b: { lat: number; lng: number } | null,
) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)) * 10) / 10;
}

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  pending: "Finding a driver",
  accepted: "Driver assigned",
  picked_up: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const DELIVERY_FLOW = ["pending", "accepted", "picked_up", "delivered"] as const;

/** Seconds a driver has to accept an offer. */
export const OFFER_WINDOW_SECONDS = 25;
/** Drivers offered per wave. */
export const WAVE_SIZE = 8;
/** Waves before we give up. */
export const MAX_WAVES = 3;

/** Platform take on each delivery. */
export const DRIVER_COMMISSION = 0.15;
export function driverPayout(price: number | null | undefined) {
  return Math.round((Number(price ?? 0) * (1 - DRIVER_COMMISSION)) * 100) / 100;
}

export const VEHICLE_TYPES = [
  { value: "bike", label: "Motorbike" },
  { value: "car", label: "Car" },
  { value: "van", label: "Van" },
  { value: "truck", label: "Truck" },
] as const;
