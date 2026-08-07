import type { CapacitorConfig } from "@capacitor/cli";
import base, { ZWITS_ORIGIN, remoteServer } from "./capacitor.config";

/** Zwits Driver — Android app #3. Boots into /m/driver. */
const config: CapacitorConfig = {
  ...base,
  appId: "zw.co.zwits.driver",
  appName: "Zwits Driver",
  android: { ...base.android, path: "android/driver" },
  server: remoteServer(`${ZWITS_ORIGIN}/m/driver`),
  plugins: {
    ...base.plugins,
    SplashScreen: { ...(base.plugins?.SplashScreen ?? {}), backgroundColor: "#2563EB" },
  },
};

export default config;
