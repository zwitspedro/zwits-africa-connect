/**
 * Shared configuration for the OpenStreetMap + MapLibre GL mapping stack.
 * No API keys and no per-request billing — tiles come straight from OSM.
 */

export type LatLng = { lat: number; lng: number };

/** Harare, Zimbabwe — sensible default view for the Zwits platform. */
export const DEFAULT_CENTER: LatLng = { lat: -17.8252, lng: 31.0335 };
export const DEFAULT_ZOOM = 12;

/** Rough bounding box for Zimbabwe, used to bias address search. */
export const ZW_VIEWBOX = { west: 25.2, south: -22.5, east: 33.1, north: -15.6 };

export const OSM_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>';

/** Minimal raster style backed by the public OSM tile servers. */
export const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: OSM_ATTRIBUTION,
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

export const MARKER_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  accepted: "#0A3D91",
  in_progress: "#16A34A",
  provider: "#0A3D91",
  destination: "#16A34A",
  default: "#6b7280",
};

/** Great-circle distance in metres. */
export function haversineMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** True when `point` sits within `radiusKm` of `center` — service-area filtering. */
export function isWithinServiceArea(point: LatLng, center: LatLng, radiusKm: number) {
  return haversineMeters(point, center) <= radiusKm * 1000;
}

export function formatEta(seconds: number) {
  if (seconds < 60) return "<1 min";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Open a turn-by-turn route in an external map app (works on Android + iOS + web). */
export function directionsUrl(dest: LatLng | string) {
  const q =
    typeof dest === "string" ? encodeURIComponent(dest) : `${dest.lat},${dest.lng}`;
  return typeof dest === "string"
    ? `https://www.openstreetmap.org/search?query=${q}`
    : `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${q}`;
}
