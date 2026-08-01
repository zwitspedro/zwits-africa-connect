import { useEffect, useRef } from "react";
import type { Marker } from "maplibre-gl";
import { useMapLibre, markerEl } from "@/components/map/use-maplibre";
import { MARKER_COLORS } from "@/lib/map-config";

export function LocationMap({ lat, lng, className }: { lat: number; lng: number; className?: string }) {
  const { containerRef, mapRef, maplibre } = useMapLibre({ center: { lat, lng }, zoom: 15 });
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !maplibre) return;
    map.setCenter([lng, lat]);
    if (!markerRef.current) {
      markerRef.current = new maplibre.Marker({ element: markerEl(MARKER_COLORS.destination) })
        .setLngLat([lng, lat])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }
  }, [lat, lng, maplibre, mapRef]);

  return <div ref={containerRef} className={className ?? "h-56 w-full overflow-hidden rounded-2xl border border-border bg-muted"} />;
}
