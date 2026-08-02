import type { SectionKey } from "./dashboard-nav";

export type ProviderStepKey =
  | "profile"
  | "services"
  | "vehicle"
  | "documents"
  | "area"
  | "payout"
  | "online";

export type ProviderStep = {
  key: ProviderStepKey;
  title: string;
  hint: string;
  done: boolean;
  section: SectionKey;
};

const VEHICLE_CATEGORIES = ["delivery", "moving", "courier"];

/**
 * Derives onboarding completion from persisted data only — a step ticks once
 * the provider has actually saved the underlying database fields.
 */
export function buildProviderOnboarding({
  provider,
  profile,
  onboarding,
  vehicles,
}: {
  provider: any;
  profile: any;
  onboarding: any;
  vehicles: any[];
}): {
  steps: ProviderStep[];
  completed: number;
  total: number;
  next: ProviderStep | null;
  ready: boolean;
} {
  const needsVehicle = VEHICLE_CATEGORIES.includes(String(provider?.category ?? "").toLowerCase());

  const profileDone = !!profile?.display_name?.trim() && !!profile?.phone?.trim();
  const servicesDone =
    !!provider?.category && Number(provider?.hourly_rate ?? 0) > 0 && !!provider?.city?.trim();
  const vehicleDone = !needsVehicle || (vehicles.length > 0 && !!vehicles[0]?.plate);
  const documentsDone =
    !!provider?.id_document_url && !!provider?.selfie_url && !!provider?.business_doc_url;
  const areaDone =
    Number(onboarding?.max_travel_km ?? 0) > 0 && (onboarding?.service_areas?.length ?? 0) > 0;
  const payoutDone =
    !!onboarding?.payout_method &&
    (!!onboarding?.bank_account?.trim() || !!onboarding?.mobile_money_number?.trim());

  const all: ProviderStep[] = [
    {
      key: "profile",
      title: "Personal profile",
      hint: "Your name, phone and photo",
      done: profileDone,
      section: "profile",
    },
    {
      key: "services",
      title: "Service information",
      hint: "What you do, where and your rate",
      done: servicesDone,
      section: "profile",
    },
    {
      key: "vehicle",
      title: "Vehicle information",
      hint: "Type, registration and photo",
      done: vehicleDone,
      section: "vehicle",
    },
    {
      key: "documents",
      title: "Required documents",
      hint: "ID, selfie and business document",
      done: documentsDone,
      section: "documents",
    },
    {
      key: "area",
      title: "Service area",
      hint: "Suburbs you cover and travel radius",
      done: areaDone,
      section: "area",
    },
    {
      key: "payout",
      title: "Payment details",
      hint: "EcoCash, InnBucks or bank account",
      done: payoutDone,
      section: "payout",
    },
    {
      key: "online",
      title: "Go online",
      hint: "Join dispatch and start receiving jobs",
      done: !!provider?.available,
      section: "home",
    },
  ];

  const steps = needsVehicle ? all : all.filter((s) => s.key !== "vehicle");
  const completed = steps.filter((s) => s.done).length;
  const setupSteps = steps.filter((s) => s.key !== "online");

  return {
    steps,
    completed,
    total: steps.length,
    next: steps.find((s) => !s.done) ?? null,
    ready: setupSteps.every((s) => s.done),
  };
}
