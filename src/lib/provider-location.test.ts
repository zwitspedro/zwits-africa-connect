import { describe, expect, it } from 'vitest';
import { locationFreshness, TRACKING_STATUSES } from './provider-location';
describe('dispatch location freshness', () => {
  const now = Date.parse('2026-11-09T12:54:00Z');
  it('marks a location stale at 60 seconds, not before', () => {
    expect(locationFreshness('2026-11-09T12:53:01Z', now)).toBe('live');
    expect(locationFreshness('2026-11-09T12:53:00Z', now)).toBe('stale');
  });
  it('does not treat absent or invalid timestamps as live', () => {
    expect(locationFreshness(null, now)).toBe('missing');
    expect(locationFreshness('invalid', now)).toBe('missing');
  });
  it('tracks only assigned active stages, including the arriving alias', () => {
    expect([...TRACKING_STATUSES]).toEqual(['accepted', 'travelling', 'provider_arriving', 'arrived', 'in_progress']);
    expect(TRACKING_STATUSES.some(s => String(s) === 'completed')).toBe(false);
  });
});