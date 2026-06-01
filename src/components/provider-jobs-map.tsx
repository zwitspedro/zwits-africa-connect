/// <reference types="google.maps" />
import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MarkerClusterer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer";
import { useGoogleMaps } from "@/hooks/use-google-maps";

type Job = {
  id: string;
  lat: number | null;
  lng: number | null;
  address: string;
  category: string;
  status: string;
};

export function ProviderJobsMap({
  jobs,
  className,
}: {
  jobs: Job[];
  className?: string;
}) {
  const { ready } = useGoogleMaps();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const points = jobs.filter(
    (j): j is Job & { lat: number; lng: number } =>
      j.lat != null && j.lng != null,
  );

  useEffect(() => {
    if (!ready || !ref.current) return;
    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(ref.current, {
        center: points[0] ?? { lat: 0, lng: 0 },
        zoom: 12,
        disableDefaultUI: true,
        zoomControl: true,
      });
    }
  }, [ready, points]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (points.length === 0) return;

    const colors: Record<string, string> = {
      pending: "#f59e0b",
      accepted: "#3b82f6",
      in_progress: "#10b981",
    };

    const bounds = new google.maps.LatLngBounds();
    for (const j of points) {
      const marker = new google.maps.Marker({
        map,
        position: { lat: j.lat, lng: j.lng },
        title: `${j.category} — ${j.address}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: colors[j.status] ?? "#6b7280",
          fillOpacity: 1,
          strokeColor: "#0a0a0a",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => {
        navigate({ to: "/bookings/$id", params: { id: j.id } });
      });
      markersRef.current.push(marker);
      bounds.extend({ lat: j.lat, lng: j.lng });
    }

    if (points.length === 1) {
      map.setCenter({ lat: points[0].lat, lng: points[0].lng });
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, 60);
    }
  }, [points, navigate]);

  return (
    <div className="relative">
      <div
        ref={ref}
        className={className ?? "h-72 w-full rounded-2xl border border-border bg-muted"}
      />
      {points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          No active jobs with locations
        </div>
      )}
      <div className="absolute left-2 top-2 flex flex-wrap gap-1.5 text-[10px]">
        <Legend color="#f59e0b" label="Pending" />
        <Legend color="#3b82f6" label="Accepted" />
        <Legend color="#10b981" label="In progress" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 shadow-sm backdrop-blur">
      <span className="size-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
