import { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/hooks/use-google-maps";

export function LocationMap({ lat, lng, className }: { lat: number; lng: number; className?: string }) {
  const { ready } = useGoogleMaps();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!ready || !ref.current) return;
    const center = { lat, lng };
    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(ref.current, {
        center,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
      });
      markerRef.current = new google.maps.Marker({ map: mapRef.current, position: center });
    } else {
      mapRef.current.setCenter(center);
      markerRef.current?.setPosition(center);
    }
  }, [ready, lat, lng]);

  return <div ref={ref} className={className ?? "h-56 w-full rounded-2xl border border-border bg-muted"} />;
}
