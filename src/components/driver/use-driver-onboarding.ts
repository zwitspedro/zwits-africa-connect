export type OnboardingStepKey = "vehicle" | "profile" | "online";

export type OnboardingStep = {
  key: OnboardingStepKey;
  title: string;
  hint: string;
  done: boolean;
  locked: boolean;
};

/**
 * Derives onboarding completion purely from persisted database state so a step
 * only ticks once the provider actually saved something.
 */
export function buildDriverOnboarding({
  vehicles,
  profile,
  online,
}: {
  vehicles: any[];
  profile: any;
  online: boolean;
}): { steps: OnboardingStep[]; completed: number; total: number; next: OnboardingStepKey | null } {
  const vehicleDone = vehicles.length > 0 && !!vehicles[0]?.plate && !!profile?.licence_url;
  const profileDone =
    !!profile?.full_name?.trim() &&
    !!profile?.phone?.trim() &&
    !!profile?.city?.trim() &&
    Number(profile?.zone_radius_km ?? 0) > 0 &&
    (profile?.services?.length ?? 0) > 0;

  const steps: OnboardingStep[] = [
    {
      key: "vehicle",
      title: "Vehicle details",
      hint: "Type, licence plate, photo and driver's licence",
      done: vehicleDone,
      locked: false,
    },
    {
      key: "profile",
      title: "Driver profile",
      hint: "Your details, services and delivery zone",
      done: profileDone,
      locked: false,
    },
    {
      key: "online",
      title: "Go online",
      hint: "Join the dispatch queue and start receiving jobs",
      done: online,
      locked: !(vehicleDone && profileDone),
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done)?.key ?? null;
  return { steps, completed, total: steps.length, next };
}
