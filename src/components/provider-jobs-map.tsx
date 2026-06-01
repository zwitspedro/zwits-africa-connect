/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  MarkerClusterer,
  SuperClusterAlgorithm,
  type Cluster,
} from "@googlemaps/markerclusterer";
import { ChevronRight, X, MapPin, User, FileText, Tag, Calendar, ExternalLink } from "lucide-react";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type Job = {
  id: string;
  lat: number | null;
  lng: number | null;
  address: string;
  category: string;
  status: string;
  customer_id?: string | null;
  description?: string | null;
  scheduled_for?: string | null;
  price?: number | string | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  accepted: "#3b82f6",
  in_progress: "#10b981",
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
  const markersRef = useRef<Map<google.maps.Marker, string>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);

  const points = useMemo(
    () =>
      jobs.filter(
        (j): j is Job & { lat: number; lng: number } =>
          j.lat != null && j.lng != null,
      ),
    [jobs],
  );

  // null = show all; otherwise restrict to these booking IDs
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const detailJob = useMemo(
    () => (detailId ? jobs.find((j) => j.id === detailId) ?? null : null),
    [detailId, jobs],
  );

  const { data: customer } = useQuery({
    queryKey: ["booking-customer", detailJob?.customer_id],
    enabled: !!detailJob?.customer_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, phone, avatar_url")
        .eq("user_id", detailJob!.customer_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

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

    clustererRef.current?.clearMarkers();
    markersRef.current.forEach((_, m) => m.setMap(null));
    markersRef.current = new Map();

    if (points.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    const markers: google.maps.Marker[] = [];
    for (const j of points) {
      const marker = new google.maps.Marker({
        position: { lat: j.lat, lng: j.lng },
        title: `${j.category} — ${j.address}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: STATUS_COLORS[j.status] ?? "#6b7280",
          fillOpacity: 1,
          strokeColor: "#0a0a0a",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => {
        setSelectedIds([j.id]);
        setHighlightId(j.id);
        map.panTo({ lat: j.lat, lng: j.lng });
      });
      markers.push(marker);
      markersRef.current.set(marker, j.id);
      bounds.extend({ lat: j.lat, lng: j.lng });
    }

    clustererRef.current = new MarkerClusterer({
      map,
      markers,
      algorithm: new SuperClusterAlgorithm({ radius: 80, maxZoom: 16 }),
      onClusterClick: (_event, cluster: Cluster, m) => {
        const ids = cluster.markers
          ?.map((mk) => markersRef.current.get(mk as google.maps.Marker))
          .filter((v): v is string => !!v) ?? [];
        setSelectedIds(ids);
        setHighlightId(null);
        // Preserve default zoom-in behavior
        if (cluster.bounds) m.fitBounds(cluster.bounds);
      },
    });

    if (points.length === 1) {
      map.setCenter({ lat: points[0].lat, lng: points[0].lng });
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, 60);
    }
  }, [points]);

  useEffect(() => {
    return () => {
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
    };
  }, []);

  // Reset selection when underlying jobs change shape
  useEffect(() => {
    if (selectedIds) {
      const stillValid = selectedIds.filter((id) => points.some((p) => p.id === id));
      if (stillValid.length !== selectedIds.length) {
        setSelectedIds(stillValid.length ? stillValid : null);
      }
    }
  }, [points, selectedIds]);

  const visibleJobs = selectedIds
    ? points.filter((p) => selectedIds.includes(p.id))
    : points;

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_320px]">
      <div className="relative">
        <div
          ref={ref}
          className={className ?? "h-72 w-full rounded-2xl border border-border bg-muted md:h-[420px]"}
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

      <aside className="flex h-72 flex-col rounded-2xl border border-border bg-card md:h-[420px]">
        <header className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {selectedIds ? "Selected" : "All active"} · {visibleJobs.length}
          </div>
          {selectedIds && (
            <button
              type="button"
              onClick={() => {
                setSelectedIds(null);
                setHighlightId(null);
              }}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
            >
              <X className="size-3" /> Clear
            </button>
          )}
        </header>
        <ul className="flex-1 divide-y divide-border overflow-y-auto">
          {visibleJobs.length === 0 && (
            <li className="p-4 text-center text-xs text-muted-foreground">
              Tap a marker or cluster on the map.
            </li>
          )}
          {visibleJobs.map((j) => {
            const isHighlighted = j.id === highlightId;
            return (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/bookings/$id", params: { id: j.id } })}
                  className={`flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 ${
                    isHighlighted ? "bg-muted" : ""
                  }`}
                >
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full"
                    style={{ background: STATUS_COLORS[j.status] ?? "#6b7280" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {j.category} · {j.status.replace("_", " ")}
                    </div>
                    <div className="truncate text-sm font-medium">{j.address}</div>
                  </div>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
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
