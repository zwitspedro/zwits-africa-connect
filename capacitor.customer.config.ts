import type { CapacitorConfig } from "@capacitor/cli";
import base from "./capacitor.config";

/** Zwits Customer — Android app #1. Boots into /m/customer. */
const config: CapacitorConfig = {
  ...base,
  appId: "zw.co.zwits.customer",
  appName: "Zwits",
  android: { ...base.android, path: "android/customer" },
  plugins: {
    ...base.plugins,
    SplashScreen: { ...(base.plugins?.SplashScreen ?? {}), backgroundColor: "#16A34A" },
  },
};

export default config;
