import type { Service } from "@/data/services";

/**
 * Deterministic, dependency-free relevance ranking for the static service
 * catalogue. Runs client-side on ~25 entries, so no network per keystroke.
 */

const STOPWORDS = new Set([
  "a", "an", "the", "my", "i", "need", "needs", "to", "for", "in", "of", "and", "or",
  "someone", "me", "get", "please", "want", "some", "with", "on", "at", "is", "it",
]);

/** Genuine synonyms → catalogue slugs. Keys are normalised singular tokens. */
export const SYNONYMS: Record<string, string[]> = {
  plumber: ["plumbing"], tap: ["plumbing"], leak: ["plumbing"], leaking: ["plumbing"],
  drain: ["plumbing"], pipe: ["plumbing"], geyser: ["plumbing"], toilet: ["plumbing"], sink: ["plumbing"],
  electrician: ["electrical"], electric: ["electrical"], electricity: ["electrical"], wiring: ["electrical"],
  socket: ["electrical"], light: ["electrical"], power: ["electrical"],
  cleaner: ["cleaning"], clean: ["cleaning"], maid: ["cleaning"], housekeeping: ["cleaning"],
  painter: ["painting"], paint: ["painting"],
  carpenter: ["carpentry"], joiner: ["carpentry"], cupboard: ["carpentry"],
  welder: ["welding"], gate: ["welding"],
  mechanic: ["mechanic"], car: ["mechanic"], tyre: ["mechanic"], tire: ["mechanic"],
  panel: ["solar"], inverter: ["solar"], battery: ["solar"],
  borehole: ["borehole"], pump: ["borehole"],
  fridge: ["appliance-repairs"], stove: ["appliance-repairs"], appliance: ["appliance-repairs"],
  wifi: ["wifi-installation"], "wi-fi": ["wifi-installation"], internet: ["wifi-installation"], router: ["wifi-installation"],
  computer: ["it-services"], laptop: ["it-services"], it: ["it-services"],
  tutor: ["tutors"], teacher: ["tutors"], lesson: ["tutors"], tuition: ["tutors"],
  hair: ["beauty"], salon: ["beauty"], nail: ["beauty"], makeup: ["beauty"], barber: ["beauty"],
  gardener: ["gardening"], garden: ["gardening"], lawn: ["gardening"],
  guard: ["security"], cctv: ["security"], alarm: ["security"],
  mover: ["moving"], move: ["moving"], removal: ["moving"], relocation: ["moving"],
  ride: ["transport"], taxi: ["transport"], lift: ["transport"],
  handyman: ["repairs"], fix: ["repairs"], repair: ["repairs"],
  parcel: ["deliveries"], package: ["deliveries"], courier: ["deliveries"], send: ["deliveries"],
  deliver: ["deliveries"], delivery: ["deliveries"], rider: ["deliveries"],
  tractor: ["farming"], farm: ["farming"],
  designer: ["freelance"], developer: ["freelance"], writer: ["freelance"],
  locksmith: ["emergency"], urgent: ["emergency"], emergency: ["emergency"],
};

const SPELLING: Record<string, string> = { colour: "color", tyres: "tyre", tires: "tyre", wi: "wifi" };

export function normalise(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function singular(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (/(ches|shes|sses|xes)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function tokenize(input: string): string[] {
  return normalise(input)
    .split(" ")
    .filter(Boolean)
    .map((w) => SPELLING[w] ?? w)
    .map(singular)
    .filter((w) => !STOPWORDS.has(w));
}

const words = (text: string) => new Set(tokenize(text));

export type RankedService = { service: Service; score: number };

/** Score a single service. 0 = not relevant. */
export function scoreService(service: Service, query: string): number {
  const q = normalise(query);
  const tokens = tokenize(query);
  if (!q || tokens.length === 0) return 0;

  const name = normalise(service.name);
  const nameWords = words(service.name);
  const slugWords = words(service.slug.replace(/-/g, " "));
  const exampleWords = words(service.examples.join(" "));
  const textWords = words(`${service.tagline} ${service.description}`);

  let score = 0;
  if (q === name || singular(q) === singular(name)) score += 1000; // exact service name
  else if (q === service.slug || singular(q) === service.slug) score += 900; // exact category
  else if (q.length >= 3 && name.startsWith(q)) score += 600; // strong prefix

  let matched = 0;
  for (const t of tokens) {
    let best = 0;
    const prefix = (set: Set<string>) => t.length >= 3 && [...set].some((w) => w.startsWith(t));
    if (nameWords.has(t) || slugWords.has(t)) best = 120;
    else if (prefix(nameWords) || prefix(slugWords)) best = 80;
    else if (exampleWords.has(t)) best = 60;
    else if (SYNONYMS[t]?.includes(service.slug)) best = 50;
    else if (prefix(exampleWords)) best = 40;
    else if (textWords.has(t)) best = 20;
    else if (t.length >= 4 && prefix(textWords)) best = 10;
    if (SYNONYMS[t]?.includes(service.slug) && best < 50) best = 50;
    else if (SYNONYMS[t]?.includes(service.slug)) best += 15; // synonym reinforces
    if (best > 0) matched++;
    score += best;
  }
  if (matched === 0) return 0;
  // Reward covering more of the query's words.
  return score + Math.round((matched / tokens.length) * 30);
}

/** Rank the catalogue by relevance; ties keep catalogue order. Ranking happens before limiting. */
export function rankServices(list: Service[], query: string, limit?: number): Service[] {
  const ranked = list
    .map((service, index) => ({ service, index, score: scoreService(service, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.service);
  return limit ? ranked.slice(0, limit) : ranked;
}
