/**
 * Platform detection + safe plugin access for the shared mobile core.
 *
 * Every module in `src/mobile` must keep working in the browser build, so
 * native plugins are always loaded lazily and behind `isNative()`.
 */

export type MobilePlatform = "android" | "ios" | "web";

let cachedPlatform: MobilePlatform | null = null;

export function getPlatform(): MobilePlatform {
  if (cachedPlatform) return cachedPlatform;
  if (typeof window === "undefined") return "web";
  const cap = (window as any).Capacitor;
  cachedPlatform = (cap?.getPlatform?.() as MobilePlatform) ?? "web";
  return cachedPlatform;
}

export function isNative(): boolean {
  const p = getPlatform();
  return p === "android" || p === "ios";
}

export function isAndroid(): boolean {
  return getPlatform() === "android";
}

/**
 * Loads a Capacitor plugin module only on device. Returns null on web (or if
 * the plugin is unavailable) so callers can fall back to a browser API.
 */
export async function nativeOnly<T>(load: () => Promise<T>): Promise<T | null> {
  if (!isNative()) return null;
  try {
    return await load();
  } catch {
    return null;
  }
}
