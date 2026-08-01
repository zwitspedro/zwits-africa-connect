import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { haversineMeters, ZW_VIEWBOX } from "@/lib/map-config";

const LatLngSchema = z.object({ lat: z.number(), lng: z.number() });

const NOMINATIM = "https://nominatim.openstreetmap.org";
const ORS = "https://api.openrouteservice.org/v2";
const UA = "ZwitsPlatform/1.0 (https://zwits.co.zw)";

export type GeoSuggestion = {
  id: string;
  label: string;
  primary: string;
  secondary: string;
  lat: number;
  lng: number;
};

/** Address search / autocomplete via Nominatim (OpenStreetMap). */
export const searchAddress = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().min(2).max(120), limit: z.number().min(1).max(10).optional() }).parse(input),
  )
  .handler(async ({ data }): Promise<GeoSuggestion[]> => {
    const params = new URLSearchParams({
      q: data.query,
      format: "jsonv2",
      addressdetails: "1",
      limit: String(data.limit ?? 6),
      countrycodes: "zw",
      viewbox: `${ZW_VIEWBOX.west},${ZW_VIEWBOX.north},${ZW_VIEWBOX.east},${ZW_VIEWBOX.south}`,
    });
    const res = await fetch(`${NOMINATIM}/search?${params}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      place_id: number;
      display_name: string;
      name?: string;
      lat: string;
      lon: string;
    }>;
    return rows.map((r) => {
      const parts = r.display_name.split(", ");
      return {
        id: String(r.place_id),
        label: r.display_name,
        primary: r.name || parts[0] || r.display_name,
        secondary: parts.slice(1).join(", "),
        lat: Number(r.lat),
        lng: Number(r.lon),
      };
    });
  });

/** Coordinates → human readable address. */
export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => LatLngSchema.parse(input))
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      lat: String(data.lat),
      lon: String(data.lng),
      format: "jsonv2",
    });
    const res = await fetch(`${NOMINATIM}/reverse?${params}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return { address: null as string | null };
    const json = (await res.json()) as { display_name?: string };
    return { address: json.display_name ?? null };
  });

type OrsRoute = {
  durationSeconds: number | null;
  distanceMeters: number | null;
  /** [lng, lat] pairs for drawing the route line. */
  geometry: [number, number][] | null;
  estimated: boolean;
};

async function orsDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  withGeometry: boolean,
): Promise<OrsRoute> {
  const key = process.env["ORS_API_KEY"];
  if (!key) return estimate(origin, destination, withGeometry);

  const res = await fetch(`${ORS}/directions/driving-car/geojson`, {
    method: "POST",
    headers: {
      Authorization: key,
      "Content-Type": "application/json",
      Accept: "application/geo+json",
    },
    body: JSON.stringify({
      coordinates: [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
      ],
      instructions: false,
    }),
  });

  if (!res.ok) {
    console.error(`OpenRouteService ${res.status}: ${await res.text()}`);
    return estimate(origin, destination, withGeometry);
  }

  const json = (await res.json()) as {
    features?: Array<{
      properties?: { summary?: { duration?: number; distance?: number } };
      geometry?: { coordinates?: [number, number][] };
    }>;
  };
  const f = json.features?.[0];
  const summary = f?.properties?.summary;
  if (!summary?.duration) return estimate(origin, destination, withGeometry);
  return {
    durationSeconds: Math.round(summary.duration),
    distanceMeters: summary.distance != null ? Math.round(summary.distance) : null,
    geometry: withGeometry ? (f?.geometry?.coordinates ?? null) : null,
    estimated: false,
  };
}

/** Straight-line fallback so the UI degrades gracefully without an ORS key. */
function estimate(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  withGeometry: boolean,
): OrsRoute {
  const straight = haversineMeters(origin, destination);
  const roadMeters = Math.round(straight * 1.35);
  return {
    durationSeconds: Math.round(roadMeters / (30_000 / 3600)), // ~30 km/h urban
    distanceMeters: roadMeters,
    geometry: withGeometry
      ? [
          [origin.lng, origin.lat],
          [destination.lng, destination.lat],
        ]
      : null,
    estimated: true,
  };
}

/** ETA + distance only (cheap, used for live tracking badges). */
export const getDrivingEta = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ origin: LatLngSchema, destination: LatLngSchema }).parse(input),
  )
  .handler(async ({ data }) => orsDirections(data.origin, data.destination, false));

/** ETA + distance + route polyline for map visualisation. */
export const getDrivingRoute = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ origin: LatLngSchema, destination: LatLngSchema }).parse(input),
  )
  .handler(async ({ data }) => orsDirections(data.origin, data.destination, true));
