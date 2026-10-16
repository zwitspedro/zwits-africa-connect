export type AdminPeriod = 'today' | '7days' | '30days' | 'month' | 'previous' | 'custom';
const DAY = 86400000;
export function adminRange(period: AdminPeriod, now = new Date(), from?: string, to?: string) {
  const local = new Date(now.getTime() + 2 * 3600000);
  const year = local.getUTCFullYear(), month = local.getUTCMonth(), day = local.getUTCDate();
  const midnight = Date.UTC(year, month, day) - 2 * 3600000;
  let start = midnight, end = midnight + DAY;
  if (period === '7days') start -= 6 * DAY;
  if (period === '30days') start -= 29 * DAY;
  if (period === 'month') start = Date.UTC(year, month, 1) - 2 * 3600000;
  if (period === 'previous') { start = Date.UTC(year, month - 1, 1) - 2 * 3600000; end = Date.UTC(year, month, 1) - 2 * 3600000; }
  if (period === 'custom') { start = Date.parse(`${from}T00:00:00+02:00`); end = Date.parse(`${to}T00:00:00+02:00`) + DAY; }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || end - start > 367 * DAY) throw new Error('Select a valid date range of at most one year.');
  return { from: new Date(start).toISOString(), to: new Date(end).toISOString() };
}
export const adminHead = (title: string, description: string) => ({ meta: [
  { title: `${title} — Zwits admin` }, { name: 'description', content: description },
  { property: 'og:title', content: `${title} — Zwits admin` }, { property: 'og:description', content: description },
  { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex, nofollow' },
] });
