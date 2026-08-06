import type { CapacitorConfig } from "@capacitor/cli";
import base from "./capacitor.config";

/** Zwits Provider — Android app #2. Boots into /m/provider. */
const config: CapacitorConfig = {
  ...base,
  appId: "zw.co.zwits.provider",
  appName: "Zwits Provider",
  android: { ...base.android, path: "android/provider" },
  plugins: {
    ...base.plugins,
    SplashScreen: { ...(base.plugins?.SplashScreen ?? {}), backgroundColor: "#0B0F0D" },
  },
};

export default config;
