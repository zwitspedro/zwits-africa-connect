import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Marker } from "maplibre-gl";
import { Clock } from "lucide-react";
import { useMapLibre, markerEl } from "@/components/map/use-maplibre";
import { supabase } from "@/integrations/supabase/client";
import { getDrivingRoute } from "@/lib/geo.functions";
import { MARKER_COLORS, formatEta, formatDistance, type LatLng } from "@/lib/map-config";

// Round coords to ~50m so small jitter doesn't trigger refetches
const roundCoord = (n: number) => Math.round(n * 2000) / 2000;

const ROUTE_SOURCE = "live-route";

export function LiveTrackingMap({
  bookingId,
  destination,
  className,
}: {
  bookingId: string;
  destination: LatLng | null;
  className?: string;
}) {
  const { containerRef, mapRef, maplibre, ready } = useMapLibre({
    center: destination,
    zoom: 13,
  });
  const destMarker = useRef<Marker | null>(null);
  const providerMarker = useRef<Marker | null>(null);

  // Latest known provider position (initial load + realtime updates)
  const { data: initialPos } = useQuery({
    queryKey: ["provider-location", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_locations")
        .select("lat,lng")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [pos, setPos] = useState<LatLng | null>(null);

  useEffect(() => {
    if (initialPos && !pos) setPos({ lat: initialPos.lat, lng: initialPos.lng });
  }, [initialPos, pos]);

  // Subscribe to live inserts
  useEffect(() => {
    const channel = supabase
      .channel(`provider_locations:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "provider_locations",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const row = payload.new as { lat: number; lng: number };
          setPos({ lat: row.lat, lng: row.lng });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  // Destination marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !maplibre || !destination) return;
    if (!destMarker.current) {
      destMarker.current = new maplibre.Marker({ element: markerEl(MARKER_COLORS.destination, "A") })
        .setLngLat([destination.lng, destination.lat])
        .addTo(map);
    } else {
      destMarker.current.setLngLat([destination.lng, destination.lat]);
    }
  }, [destination, maplibre, mapRef]);

  // Provider marker + auto-fit
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !maplibre || !pos) return;
    if (!providerMarker.current) {
      providerMarker.current = new maplibre.Marker({ element: markerEl(MARKER_COLORS.provider) })
        .setLngLat([pos.lng, pos.lat])
        .addTo(map);
    } else {
      providerMarker.current.setLngLat([pos.lng, pos.lat]);
    }

    if (destination) {
      const bounds = new maplibre.LngLatBounds(
        [pos.lng, pos.lat],
        [pos.lng, pos.lat],
      ).extend([destination.lng, destination.lat]);
      map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 600 });
    } else {
      map.easeTo({ center: [pos.lng, pos.lat], duration: 600 });
    }
  }, [pos, destination, maplibre, mapRef]);

  // Route + ETA via OpenRouteService (server fn). Keyed on rounded coords so it
  // only refetches when the provider has actually moved a meaningful distance.
  const fetchRoute = useServerFn(getDrivingRoute);
  const etaKey =
    pos && destination
      ? [roundCoord(pos.lat), roundCoord(pos.lng), roundCoord(destination.lat), roundCoord(destination.lng)]
      : null;
  const { data: eta } = useQuery({
    queryKey: ["route", bookingId, etaKey],
    enabled: !!pos && !!destination,
    staleTime: 20_000,
    queryFn: () => fetchRoute({ data: { origin: pos!, destination: destination! } }),
  });

  // Draw the route line
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const coords = eta?.geometry;
    const geojson = {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: coords ?? [] },
    };
    const src = map.getSource(ROUTE_SOURCE) as
      | { setData: (d: typeof geojson) => void }
      | undefined;
    if (src) {
      src.setData(geojson);
      return;
    }
    if (!coords?.length) return;
    map.addSource(ROUTE_SOURCE, { type: "geojson", data: geojson });
    map.addLayer({
      id: `${ROUTE_SOURCE}-line`,
      type: "line",
      source: ROUTE_SOURCE,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": MARKER_COLORS.provider,
        "line-width": 5,
        "line-opacity": 0.85,
      },
    });
  }, [eta, ready, mapRef]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={className ?? "h-72 w-full overflow-hidden rounded-2xl border border-border bg-muted"}
      />
      {!pos && (
        <div className="pointer-events-none absolute inset-x-0 top-2 mx-auto w-fit rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          Waiting for provider location…
        </div>
      )}
      {pos && eta?.durationSeconds != null && (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur">
          <Clock className="size-3.5 text-primary" />
          <span>
            {eta.estimated ? "~" : ""}ETA {formatEta(eta.durationSeconds)}
          </span>
          {eta.distanceMeters != null && (
            <span className="text-muted-foreground">· {formatDistance(eta.distanceMeters)}</span>
          )}
        </div>
      )}
    </div>
  );
}
