import { describe, it, expect } from "vitest";
import { services } from "@/data/services";
import { rankServices, normalise } from "@/lib/service-search";

const top = (q: string) => rankServices(services, q)[0]?.slug;

describe("service search relevance", () => {
  it.each([
    ["plumber", "plumbing"],
    ["plumbing", "plumbing"],
    ["fix leaking tap", "plumbing"],
    ["electrician", "electrical"],
    ["house cleaning", "cleaning"],
    ["solar panels", "solar"],
    ["send a parcel", "deliveries"],
    ["Borehole Repairs", "borehole"],
    ["blocked drains", "plumbing"],
    ["washing machine", "appliance-repairs"],
    ["router setup", "wifi-installation"],
  ])("%s → %s first", (q, slug) => {
    expect(top(q)).toBe(slug);
  });

  it("case and surrounding spaces do not change ranking", () => {
    const base = rankServices(services, "house cleaning").map((s) => s.slug);
    expect(rankServices(services, "HOUSE Cleaning").map((s) => s.slug)).toEqual(base);
    expect(rankServices(services, "   house   cleaning  ").map((s) => s.slug)).toEqual(base);
  });

  it("normalises punctuation", () => {
    expect(normalise("  Wi-Fi!!  set-up ")).toBe("wi fi set up");
  });

  it("an exact name match outranks catalogue order", () => {
    // Delivery is first in the catalogue; it must not outrank Plumbing for "plumbing".
    const r = rankServices(services, "plumbing").map((s) => s.slug);
    expect(r[0]).toBe("plumbing");
    if (r.includes("deliveries")) expect(r.indexOf("deliveries")).toBeGreaterThan(0);
  });

  it("returns only existing catalogue services", () => {
    const slugs = new Set(services.map((s) => s.slug));
    for (const s of rankServices(services, "repair fix clean")) expect(slugs.has(s.slug)).toBe(true);
  });

  it("unrelated text returns no results", () => {
    expect(rankServices(services, "zzqxv")).toEqual([]);
    expect(rankServices(services, "   ")).toEqual([]);
  });

  it("limiting keeps the relevance order", () => {
    const all = rankServices(services, "repairs");
    expect(rankServices(services, "repairs", 3)).toEqual(all.slice(0, 3));
  });
});
