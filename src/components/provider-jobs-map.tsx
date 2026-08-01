import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { GeoJSONSource, MapGeoJSONFeature } from "maplibre-gl";
import {
  ChevronRight,
  X,
  MapPin,
  User,
  FileText,
  Tag,
  Calendar,
  ExternalLink,
  Phone,
  MessageCircle,
} from "lucide-react";
import { useMapLibre } from "@/components/map/use-maplibre";
import { supabase } from "@/integrations/supabase/client";
import {
  MARKER_COLORS,
  DEFAULT_CENTER,
  isWithinServiceArea,
  type LatLng,
} from "@/lib/map-config";
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

const SRC = "jobs";
const RADIUS_OPTIONS = [0, 5, 10, 25] as const;

export function ProviderJobsMap({ jobs, className }: { jobs: Job[]; className?: string }) {
  const navigate = useNavigate();
  const { containerRef, mapRef, maplibre, ready } = useMapLibre({ zoom: 11 });

  // null = show all; otherwise restrict to these booking IDs
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Service-area filtering around the provider's own position
  const [radiusKm, setRadiusKm] = useState<number>(0);
  const [origin, setOrigin] = useState<LatLng>(DEFAULT_CENTER);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  const points = useMemo(
    () =>
      jobs
        .filter((j): j is Job & { lat: number; lng: number } => j.lat != null && j.lng != null)
        .filter((j) => !radiusKm || isWithinServiceArea({ lat: j.lat, lng: j.lng }, origin, radiusKm)),
    [jobs, radiusKm, origin],
  );

  const detailJob = useMemo(
    () => (detailId ? (jobs.find((j) => j.id === detailId) ?? null) : null),
    [detailId, jobs],
  );

  const { data: customer } = useQuery({
    queryKey: ["booking-customer", detailJob?.customer_id],
    enabled: !!detailJob?.customer_id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_booking_counterpart_profile", {
        _user_id: detailJob!.customer_id!,
      });
      if (error) throw error;
      return (data && data[0]) ?? null;
    },
  });

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: points.map((j) => ({
        type: "Feature" as const,
        properties: { id: j.id, status: j.status, category: j.category, address: j.address },
        geometry: { type: "Point" as const, coordinates: [j.lng, j.lat] },
      })),
    }),
    [points],
  );

  // Build clustered source + layers once the style is loaded
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const existing = map.getSource(SRC) as GeoJSONSource | undefined;
    if (existing) {
      existing.setData(geojson);
    } else {
      map.addSource(SRC, {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterRadius: 60,
        clusterMaxZoom: 15,
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: SRC,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": MARKER_COLORS.provider,
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 30, 28],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: SRC,
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "job-point",
        type: "circle",
        source: SRC,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 9,
          "circle-color": [
            "match",
            ["get", "status"],
            "pending",
            MARKER_COLORS.pending,
            "accepted",
            MARKER_COLORS.accepted,
            "in_progress",
            MARKER_COLORS.in_progress,
            MARKER_COLORS.default,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      const pointer = (v: string) => () => (map.getCanvas().style.cursor = v);
      for (const layer of ["clusters", "job-point"]) {
        map.on("mouseenter", layer, pointer("pointer"));
        map.on("mouseleave", layer, pointer(""));
      }

      map.on("click", "job-point", (e) => {
        const f = e.features?.[0] as MapGeoJSONFeature | undefined;
        const id = f?.properties?.["id"] as string | undefined;
        if (!id) return;
        setSelectedIds([id]);
        setHighlightId(id);
        map.easeTo({ center: e.lngLat, duration: 500 });
      });

      map.on("click", "clusters", async (e) => {
        const f = e.features?.[0];
        const clusterId = f?.properties?.["point_count"] ? f.properties["cluster_id"] : null;
        const source = map.getSource(SRC) as GeoJSONSource;
        if (clusterId == null) return;
        const leaves = await source.getClusterLeaves(Number(clusterId), 100, 0);
        setSelectedIds(
          leaves.map((l) => l.properties?.["id"] as string).filter((v): v is string => !!v),
        );
        setHighlightId(null);
        const zoom = await source.getClusterExpansionZoom(Number(clusterId));
        map.easeTo({ center: e.lngLat, zoom, duration: 500 });
      });
    }

    if (points.length && maplibre) {
      const bounds = new maplibre.LngLatBounds(
        [points[0].lng, points[0].lat],
        [points[0].lng, points[0].lat],
      );
      points.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 500 });
    }
  }, [geojson, ready, mapRef, maplibre, points]);

  // Reset selection when underlying jobs change shape
  useEffect(() => {
    if (selectedIds) {
      const stillValid = selectedIds.filter((id) => points.some((p) => p.id === id));
      if (stillValid.length !== selectedIds.length) {
        setSelectedIds(stillValid.length ? stillValid : null);
      }
    }
  }, [points, selectedIds]);

  const visibleJobs = selectedIds ? points.filter((p) => selectedIds.includes(p.id)) : points;

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_320px]">
      <div className="relative">
        <div
          ref={containerRef}
          className={className ?? "h-72 w-full overflow-hidden rounded-2xl border border-border bg-muted md:h-[420px]"}
        />
        {points.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            No active jobs with locations
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5 text-[10px]">
          <Legend color={MARKER_COLORS.pending} label="Pending" />
          <Legend color={MARKER_COLORS.accepted} label="Accepted" />
          <Legend color={MARKER_COLORS.in_progress} label="In progress" />
        </div>
        <div className="absolute bottom-8 left-2 flex flex-wrap gap-1.5">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadiusKm(r)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium shadow-sm backdrop-blur transition-colors ${
                radiusKm === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/90 text-muted-foreground hover:bg-background"
              }`}
            >
              {r === 0 ? "All areas" : `${r} km`}
            </button>
          ))}
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
            const isHighlighted = j.id === highlightId || j.id === detailId;
            return (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => {
                    setDetailId(j.id);
                    setHighlightId(j.id);
                    mapRef.current?.easeTo({ center: [j.lng, j.lat], duration: 500 });
                  }}
                  className={`flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 ${
                    isHighlighted ? "bg-muted" : ""
                  }`}
                >
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full"
                    style={{ background: MARKER_COLORS[j.status] ?? MARKER_COLORS.default }}
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

      <Sheet open={!!detailJob} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {detailJob && (
            <>
              <SheetHeader className="text-left">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: MARKER_COLORS[detailJob.status] ?? MARKER_COLORS.default }}
                  />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {detailJob.status.replace("_", " ")}
                  </span>
                </div>
                <SheetTitle className="font-display text-2xl">{detailJob.category}</SheetTitle>
                <SheetDescription>Booking #{detailJob.id.slice(0, 8)}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 grid gap-4 text-sm">
                <Field icon={<User className="size-4" />} label="Customer">
                  {customer?.display_name ?? "—"}
                  {customer?.phone && (
                    <div className="text-xs text-muted-foreground">{customer.phone}</div>
                  )}
                </Field>

                {customer?.phone && (
                  <div className="flex gap-2">
                    <a
                      href={`tel:${customer.phone}`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white"
                    >
                      <Phone className="size-4" /> Call
                    </a>
                    <Link
                      to="/messages/$bookingId"
                      params={{ bookingId: detailJob.id }}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
                    >
                      <MessageCircle className="size-4" /> Chat
                    </Link>
                  </div>
                )}

                <Field icon={<Tag className="size-4" />} label="Service">
                  {detailJob.category}
                  {detailJob.price != null && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ${Number(detailJob.price).toFixed(0)}
                    </span>
                  )}
                </Field>
                <Field icon={<MapPin className="size-4" />} label="Address">
                  {detailJob.address}
                </Field>
                {detailJob.scheduled_for && (
                  <Field icon={<Calendar className="size-4" />} label="Scheduled">
                    {new Date(detailJob.scheduled_for).toLocaleString()}
                  </Field>
                )}
                <Field icon={<FileText className="size-4" />} label="Notes">
                  {detailJob.description ? (
                    <p className="whitespace-pre-wrap">{detailJob.description}</p>
                  ) : (
                    <span className="text-muted-foreground">No notes provided.</span>
                  )}
                </Field>
              </div>

              <button
                type="button"
                onClick={() => navigate({ to: "/bookings/$id", params: { id: detailJob.id } })}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Open full booking
                <ExternalLink className="size-4" />
              </button>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-sm">{children}</div>
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
