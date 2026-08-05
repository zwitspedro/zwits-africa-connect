/**
 * Theme module — keeps the native chrome (status bar, splash) in step with the
 * app's design tokens and the user's theme setting.
 *
 * Colours are always read from the CSS design tokens, never hardcoded, so the
 * mobile shells inherit the Zwits palette automatically.
 */
import { useEffect } from "react";
import { nativeOnly, isNative } from "./platform";
import { useMobileSettings, type MobileSettings } from "./settings";

export type ResolvedTheme = "light" | "dark";

export function resolveTheme(pref: MobileSettings["theme"]): ResolvedTheme {
  if (pref !== "system") return pref;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Reads a design token as a concrete colour string for native APIs. */
function tokenColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!value) return fallback;
  // Native plugins need a hex value; resolve via a throwaway element.
  const probe = document.createElement("span");
  probe.style.color = value.startsWith("--") ? `var(${value})` : value;
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return fallback;
  const hex = m
    .slice(0, 3)
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

async function applyNativeChrome(theme: ResolvedTheme) {
  const bar = await nativeOnly(() => import("@capacitor/status-bar"));
  if (!bar) return;
  try {
    await bar.StatusBar.setStyle({ style: theme === "dark" ? bar.Style.Dark : bar.Style.Light });
    await bar.StatusBar.setBackgroundColor({ color: tokenColor("--background", "#ffffff") });
  } catch {
    /* status bar unavailable on this device */
  }
}

/** Applies the theme class and syncs native chrome. Call once from the shell. */
export function useMobileTheme() {
  const { settings, update } = useMobileSettings();
  const theme = resolveTheme(settings.theme);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    void applyNativeChrome(theme);
  }, [theme]);

  useEffect(() => {
    if (settings.theme !== "system" || typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = mql.matches ? "dark" : "light";
      document.documentElement.classList.toggle("dark", next === "dark");
      void applyNativeChrome(next);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [settings.theme]);

  return { theme, preference: settings.theme, setTheme: (t: MobileSettings["theme"]) => update({ theme: t }) };
}

/** Dismisses the native splash once the first screen is ready. */
export async function hideSplash() {
  const mod = await nativeOnly(() => import("@capacitor/splash-screen"));
  await mod?.SplashScreen.hide();
}

/** Light tactile feedback for primary actions (no-op on web). */
export async function tap() {
  if (!isNative()) return;
  const mod = await nativeOnly(() => import("@capacitor/haptics"));
  await mod?.Haptics.impact({ style: mod.ImpactStyle.Light });
}
