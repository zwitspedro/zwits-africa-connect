export const LOCATION_STALE_MS = 60_000;
export const TRACKING_STATUSES = ['accepted', 'travelling', 'provider_arriving', 'arrived', 'in_progress'] as const;
export function locationFreshness(updatedAt: string | null, now: number): 'live' | 'stale' | 'missing' {
  if (!updatedAt || !Number.isFinite(Date.parse(updatedAt))) return 'missing';
  return now - Date.parse(updatedAt) >= LOCATION_STALE_MS ? 'stale' : 'live';
}
export type DispatchLocation = {
  booking_id: string; provider_name: string; status: string; address: string;
  lat: number | null; lng: number | null; updated_at: string | null; accuracy: number | null;
};