/**
 * Mobile storage — a single async key/value surface used by every module.
 *
 * Uses Capacitor Preferences on device (survives app restarts and WebView
 * cache clears) and localStorage in the browser build.
 */
import { nativeOnly } from "./platform";

const PREFIX = "zwits.";

export const mobileStorage = {
  async get(key: string): Promise<string | null> {
    const mod = await nativeOnly(() => import("@capacitor/preferences"));
    if (mod) return (await mod.Preferences.get({ key: PREFIX + key })).value ?? null;
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(PREFIX + key);
  },

  async set(key: string, value: string): Promise<void> {
    const mod = await nativeOnly(() => import("@capacitor/preferences"));
    if (mod) {
      await mod.Preferences.set({ key: PREFIX + key, value });
      return;
    }
    if (typeof localStorage !== "undefined") localStorage.setItem(PREFIX + key, value);
  },

  async remove(key: string): Promise<void> {
    const mod = await nativeOnly(() => import("@capacitor/preferences"));
    if (mod) {
      await mod.Preferences.remove({ key: PREFIX + key });
      return;
    }
    if (typeof localStorage !== "undefined") localStorage.removeItem(PREFIX + key);
  },

  async getJSON<T>(key: string, fallback: T): Promise<T> {
    const raw = await mobileStorage.get(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  async setJSON(key: string, value: unknown): Promise<void> {
    await mobileStorage.set(key, JSON.stringify(value));
  },
};
