/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock } from "lucide-react";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { supabase } from "@/integrations/supabase/client";
import { getDrivingEta } from "@/lib/eta.functions";

type LatLng = { lat: number; lng: number };

// Round coords to ~50m so small jitter doesn't trigger refetches
const roundCoord = (n: number) => Math.round(n * 2000) / 2000;

export function LiveTrackingMap({
  bookingId,
  destination,
  className,
}: {
  bookingId: string;
  destination: LatLng | null;
  className?: string;
}) {
  const { ready } = useGoogleMaps();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const destMarker = useRef<google.maps.Marker | null>(null);
  const providerMarker = useRef<google.maps.Marker | null>(null);

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

  // Init map
  useEffect(() => {
    if (!ready || !ref.current) return;
    const center = pos ?? destination ?? { lat: 0, lng: 0 };
    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(ref.current, {
        center,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
      });
    }
  }, [ready, pos, destination]);

  // Destination marker
  useEffect(() => {
    if (!mapRef.current || !destination) return;
    if (!destMarker.current) {
      destMarker.current = new google.maps.Marker({
        map: mapRef.current,
        position: destination,
        label: { text: "A", color: "#fff" },
      });
    } else {
      destMarker.current.setPosition(destination);
    }
  }, [destination, ready]);

  // Provider marker + auto-fit
  useEffect(() => {
    if (!mapRef.current || !pos) return;
    if (!providerMarker.current) {
      providerMarker.current = new google.maps.Marker({
        map: mapRef.current,
        position: pos,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        title: "Provider",
      });
    } else {
      providerMarker.current.setPosition(pos);
    }

    if (destination) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(pos);
      bounds.extend(destination);
      mapRef.current.fitBounds(bounds, 60);
    } else {
      mapRef.current.panTo(pos);
    }
  }, [pos, destination]);

  // ETA via Routes API (server fn). Keyed on rounded coords so it only
  // refetches when the provider has actually moved a meaningful distance.
  const fetchEta = useServerFn(getDrivingEta);
  const etaKey = pos && destination
    ? [roundCoord(pos.lat), roundCoord(pos.lng), roundCoord(destination.lat), roundCoord(destination.lng)]
    : null;
  const { data: eta } = useQuery({
    queryKey: ["eta", bookingId, etaKey],
    enabled: !!pos && !!destination,
    staleTime: 20_000,
    queryFn: () => fetchEta({ data: { origin: pos!, destination: destination! } }),
  });

  return (
    <div className="relative">
      <div ref={ref} className={className ?? "h-72 w-full rounded-2xl border border-border bg-muted"} />
      {!pos && (
        <div className="pointer-events-none absolute inset-x-0 top-2 mx-auto w-fit rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          Waiting for provider location…
        </div>
      )}
      {pos && eta?.durationSeconds != null && (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur">
          <Clock className="size-3.5 text-primary" />
          <span>ETA {formatEta(eta.durationSeconds)}</span>
          {eta.distanceMeters != null && (
            <span className="text-muted-foreground">· {formatDistance(eta.distanceMeters)}</span>
          )}
        </div>
      )}
    </div>
  );
}

function formatEta(seconds: number) {
  if (seconds < 60) return "<1 min";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
