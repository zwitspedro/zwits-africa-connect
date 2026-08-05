/**
 * Settings module — device-local preferences shared by the three apps.
 * Stored in Capacitor Preferences (native) / localStorage (web).
 */
import { useCallback, useEffect, useState } from "react";
import { mobileStorage } from "./storage";
import type { AppRole } from "@/lib/roles";

export type MobileSettings = {
  theme: "system" | "light" | "dark";
  pushEnabled: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  locationSharing: boolean;
  /** Portal the shell opens on when the user has several roles. */
  preferredPortal: AppRole | null;
  language: "en" | "sn" | "nd";
  /** Reduce background refreshes on metered connections. */
  dataSaver: boolean;
};

export const DEFAULT_SETTINGS: MobileSettings = {
  theme: "system",
  pushEnabled: true,
  soundEnabled: true,
  hapticsEnabled: true,
  locationSharing: true,
  preferredPortal: null,
  language: "en",
  dataSaver: false,
};

const KEY = "settings";

export async function loadSettings(): Promise<MobileSettings> {
  const stored = await mobileStorage.getJSON<Partial<MobileSettings>>(KEY, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(patch: Partial<MobileSettings>): Promise<MobileSettings> {
  const next = { ...(await loadSettings()), ...patch };
  await mobileStorage.setJSON(KEY, next);
  return next;
}

export function useMobileSettings() {
  const [settings, setSettings] = useState<MobileSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void loadSettings().then((s) => {
      if (!alive) return;
      setSettings(s);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback(async (patch: Partial<MobileSettings>) => {
    setSettings(await saveSettings(patch));
  }, []);

  return { settings, loading, update };
}
