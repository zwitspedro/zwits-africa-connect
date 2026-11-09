import { expect, it } from "vitest";
import { canonicalProviderStatus, isOpen, stageIndex, NEXT_ACTION } from "./job-lifecycle";
it("keeps provider_arriving jobs active and allows arrival", () => {
  expect(isOpen("provider_arriving")).toBe(true);
  expect(stageIndex("provider_arriving")).toBe(2);
  expect(NEXT_ACTION[canonicalProviderStatus("provider_arriving") as "travelling"]?.next).toBe("arrived");
});