import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Zwits shared mobile core — Capacitor configuration.
 *
 * One web build powers three Android apps (Customer, Provider, Driver); the
 * active portal is chosen at runtime from the signed-in user's roles.
 * For local device development, point `server.url` at your dev machine.
 */
const config: CapacitorConfig = {
  appId: "zw.co.zwits.app",
  appName: "Zwits",
  webDir: "dist/client",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0B0B0C",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
