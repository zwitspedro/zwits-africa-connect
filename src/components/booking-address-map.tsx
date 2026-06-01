/// <reference types="google.maps" />
import { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { Navigation } from "lucide-react";

type LatLng = { lat: number; lng: number };

export function BookingAddressMap({
  position,
  address,
  className,
}: {
  position: LatLng;
  address?: string;
  className?: string;
}) {
  const { ready } = useGoogleMaps();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address ?? `${position.lat},${position.lng}`
  )}`;

  useEffect(() => {
    if (!ready || !ref.current) return;
    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(ref.current, {
        center: position,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
      });
    } else {
      mapRef.current.setCenter(position);
    }
  }, [ready, position]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        map: mapRef.current,
        position,
        title: address ?? "Booking location",
      });

      markerRef.current.addListener("click", () => {
        window.open(mapsUrl, "_blank", "noopener,noreferrer");
      });
    } else {
      markerRef.current.setPosition(position);
    }
  }, [position, address, ready, mapsUrl]);

  return (
    <div className="group/map relative">
      <div
        ref={ref}
        className={className ?? "h-56 w-full rounded-2xl border border-border bg-muted"}
      />
      <button
        type="button"
        onClick={() => window.open(mapsUrl, "_blank", "noopener,noreferrer")}
        className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur transition-colors hover:bg-background"
      >
        <Navigation className="size-3.5 text-primary" />
        Navigate
      </button>
    </div>
  );
}
