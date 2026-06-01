import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  origin: z.object({ lat: z.number(), lng: z.number() }),
  destination: z.object({ lat: z.number(), lng: z.number() }),
});

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export const getDrivingEta = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey) throw new Error("Missing LOVABLE_API_KEY");
    if (!mapsKey) throw new Error("Missing GOOGLE_MAPS_API_KEY");

    const res = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { location: { latLng: data.origin } },
        destination: { location: { latLng: data.destination } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Routes API ${res.status}: ${body}`);
    }

    const json = (await res.json()) as {
      routes?: { duration?: string; distanceMeters?: number }[];
    };
    const route = json.routes?.[0];
    if (!route?.duration) return { durationSeconds: null, distanceMeters: null };

    // duration is a protobuf Duration string like "423s"
    const durationSeconds = Number(route.duration.replace(/s$/, "")) || null;
    return {
      durationSeconds,
      distanceMeters: route.distanceMeters ?? null,
    };
  });
