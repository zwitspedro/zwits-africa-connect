import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Zwits shared mobile core — Capacitor configuration.
 *
 * The Zwits web app is server-rendered (TanStack Start), so the production
 * bundle has no static index.html to ship inside the APK. Each Android app
 * therefore runs the published Zwits site inside the WebView and boots
 * directly into its own portal, while every native capability (camera, GPS,
 * push, preferences, haptics) still runs through the Capacitor bridge.
 */
export const ZWITS_ORIGIN = "https://zwits.co.zw";

/** Hosts the WebView is allowed to navigate to without leaving the app. */
const ALLOWED_HOSTS = ["zwits.co.zw", "www.zwits.co.zw", "*.supabase.co", "*.lovable.app"];

export function remoteServer(url: string): CapacitorConfig["server"] {
  return {
    url,
    androidScheme: "https",
    cleartext: false,
    allowNavigation: ALLOWED_HOSTS,
  };
}

const config: CapacitorConfig = {
  appId: "zw.co.zwits.app",
  appName: "Zwits",
  webDir: "dist/client",
  android: {
    allowMixedContent: false,
  },
  server: remoteServer(`${ZWITS_ORIGIN}/m`),
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0B0F0D",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
