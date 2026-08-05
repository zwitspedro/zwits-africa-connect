/**
 * Offline module — connectivity status and read-only cache policy.
 *
 * The mobile core caches reads (see state.tsx) so the app opens with
 * last-known data. Writes are online-only; `requireOnline` gives every screen
 * a single, consistent guard.
 */
import { useEffect, useState } from "react";
import { nativeOnly, isNative } from "./platform";
import { mobileStorage } from "./storage";

const LAST_SYNC_KEY = "offline.lastSync";

export function useOnlineStatus(): { online: boolean; checked: boolean } {
  const [online, setOnline] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let remove: (() => void) | undefined;

    if (isNative()) {
      void nativeOnly(() => import("@capacitor/network")).then(async (mod) => {
        if (!mod) return;
        const status = await mod.Network.getStatus();
        setOnline(status.connected);
        setChecked(true);
        const handle = await mod.Network.addListener("networkStatusChange", (s) =>
          setOnline(s.connected),
        );
        remove = () => void handle.remove();
      });
    } else if (typeof window !== "undefined") {
      setOnline(navigator.onLine);
      setChecked(true);
      const up = () => setOnline(true);
      const down = () => setOnline(false);
      window.addEventListener("online", up);
      window.addEventListener("offline", down);
      remove = () => {
        window.removeEventListener("online", up);
        window.removeEventListener("offline", down);
      };
    }

    return () => remove?.();
  }, []);

  return { online, checked };
}

export class OfflineError extends Error {
  constructor(action = "This action") {
    super(`${action} needs an internet connection. Your data is shown from the last sync.`);
    this.name = "OfflineError";
  }
}

/** Guard for any write path — the mobile core never queues mutations. */
export async function requireOnline(action?: string): Promise<void> {
  const mod = await nativeOnly(() => import("@capacitor/network"));
  const connected = mod
    ? (await mod.Network.getStatus()).connected
    : typeof navigator === "undefined"
      ? true
      : navigator.onLine;
  if (!connected) throw new OfflineError(action);
}

export async function markSynced(): Promise<void> {
  await mobileStorage.set(LAST_SYNC_KEY, new Date().toISOString());
}

export async function lastSyncedAt(): Promise<Date | null> {
  const raw = await mobileStorage.get(LAST_SYNC_KEY);
  return raw ? new Date(raw) : null;
}

/** Clears the persisted read cache (used on sign-out and account switch). */
export function clearOfflineCache(): void {
  if (typeof localStorage !== "undefined") localStorage.removeItem("zwits.query-cache");
}
