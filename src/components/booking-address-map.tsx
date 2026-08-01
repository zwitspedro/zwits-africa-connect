import { useEffect, useRef } from "react";
import type { Marker } from "maplibre-gl";
import { Navigation } from "lucide-react";
import { useMapLibre, markerEl } from "@/components/map/use-maplibre";
import { MARKER_COLORS, directionsUrl, type LatLng } from "@/lib/map-config";

export function BookingAddressMap({
  position,
  address,
  className,
}: {
  position: LatLng;
  address?: string;
  className?: string;
}) {
  const { containerRef, mapRef, maplibre } = useMapLibre({ center: position, zoom: 15 });
  const markerRef = useRef<Marker | null>(null);
  const navUrl = directionsUrl(position);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !maplibre) return;
    map.setCenter([position.lng, position.lat]);
    if (!markerRef.current) {
      const el = markerEl(MARKER_COLORS.destination);
      el.title = address ?? "Booking location";
      el.addEventListener("click", () => window.open(navUrl, "_blank", "noopener,noreferrer"));
      markerRef.current = new maplibre.Marker({ element: el })
        .setLngLat([position.lng, position.lat])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([position.lng, position.lat]);
    }
  }, [position, address, maplibre, mapRef, navUrl]);

  return (
    <div className="group/map relative">
      <div
        ref={containerRef}
        className={className ?? "h-56 w-full overflow-hidden rounded-2xl border border-border bg-muted"}
      />
      <button
        type="button"
        onClick={() => window.open(navUrl, "_blank", "noopener,noreferrer")}
        className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur transition-colors hover:bg-background"
      >
        <Navigation className="size-3.5 text-primary" />
        Navigate
      </button>
    </div>
  );
}
