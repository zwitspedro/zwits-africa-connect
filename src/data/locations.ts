/**
 * Zwits service-area registry.
 *
 * Only areas Zwits genuinely operates in are marked `live` and published as
 * indexable landing pages. Planned cities are listed for internal roadmap and
 * are never given their own indexable page until they go live.
 */

export type Suburb = {
  slug: string;
  name: string;
  /** One honest, locally useful line about the area — no invented claims. */
  blurb: string;
  landmarks: string[];
};

export const HARARE_SUBURBS: Suburb[] = [
  {
    slug: "cbd",
    name: "Harare CBD",
    blurb:
      "Document runs, supplier collections and office parcels between First Street, Samora Machel and the Kopje business district.",
    landmarks: ["First Street", "Samora Machel Avenue", "Africa Unity Square", "Kopje"],
  },
  {
    slug: "avondale",
    name: "Avondale",
    blurb:
      "Shopping-centre pickups, home repairs and cleaning bookings around Avondale, Belgravia and the Fife Avenue strip.",
    landmarks: ["Avondale Shops", "Belgravia", "Fife Avenue"],
  },
  {
    slug: "borrowdale",
    name: "Borrowdale",
    blurb:
      "Household deliveries, solar and borehole call-outs, and scheduled home services across Borrowdale, Brooke and Gunhill.",
    landmarks: ["Sam Levy's Village", "Borrowdale Brooke", "Gunhill"],
  },
  {
    slug: "marlborough",
    name: "Marlborough",
    blurb:
      "Our registered home suburb. Same-suburb parcel runs, handyman jobs and business collections along Tarlington and Harare Drive.",
    landmarks: ["Tarlington Road", "Harare Drive", "Marlborough Shops"],
  },
];

export type City = {
  slug: string;
  name: string;
  live: boolean;
};

export const CITIES: City[] = [
  { slug: "harare", name: "Harare", live: true },
  { slug: "chitungwiza", name: "Chitungwiza", live: false },
  { slug: "bulawayo", name: "Bulawayo", live: false },
  { slug: "mutare", name: "Mutare", live: false },
  { slug: "gweru", name: "Gweru", live: false },
  { slug: "masvingo", name: "Masvingo", live: false },
];

export const LIVE_CITIES = CITIES.filter((c) => c.live);

export function findSuburb(slug: string) {
  return HARARE_SUBURBS.find((s) => s.slug === slug);
}

export function findLiveCity(slug: string) {
  return LIVE_CITIES.find((c) => c.slug === slug);
}
