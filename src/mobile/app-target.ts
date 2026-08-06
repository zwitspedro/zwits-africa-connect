/**
 * Which Zwits app this bundle was built for.
 *
 * One shared codebase powers three Android apps. The Android build sets
 * `VITE_ZWITS_APP` (customer | provider | driver); the web build leaves it
 * unset, which means "decide from the signed-in user's roles".
 */
export type ZwitsApp = "customer" | "provider" | "driver";

export function getAppTarget(): ZwitsApp | null {
  const v = import.meta.env["VITE_ZWITS_APP"] as string | undefined;
  return v === "customer" || v === "provider" || v === "driver" ? v : null;
}

/** Home route for a given app target. */
export function appHome(app: ZwitsApp): "/m/customer" | "/m/provider" | "/m/driver" {
  return app === "provider" ? "/m/provider" : app === "driver" ? "/m/driver" : "/m/customer";
}
