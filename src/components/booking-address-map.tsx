/// <reference types="google.maps" />
import { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/hooks/use-google-maps";

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
    } else {
      markerRef.current.setPosition(position);
    }
  }, [position, address, ready]);

  return (
    <div
      ref={ref}
      className={className ?? "h-56 w-full rounded-2xl border border-border bg-muted"}
    />
  );
}
