/// <reference types="vite/client" />
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, MapOptions } from "maplibre-gl";
import { OSM_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM, type LatLng } from "@/lib/map-config";

type MapLibreModule = typeof import("maplibre-gl");

let loaderPromise: Promise<MapLibreModule> | null = null;

/**
 * Browser-only loader. MapLibre touches `window` at import time, so it is
 * dynamically imported (never during SSR) and cached across components.
 */
export function loadMapLibre(): Promise<MapLibreModule> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  loaderPromise ??= (async () => {
    await import("maplibre-gl/dist/maplibre-gl.css");
    return (await import("maplibre-gl")) as unknown as MapLibreModule;
  })();
  return loaderPromise;
}

export function useMapLibre(options?: {
  center?: LatLng | null;
  zoom?: number;
  interactive?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [maplibre, setMaplibre] = useState<MapLibreModule | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const center = options?.center ?? DEFAULT_CENTER;
  const zoom = options?.zoom ?? DEFAULT_ZOOM;
  // Only the initial view is applied here; callers move the map afterwards.
  const initial = useRef({ center, zoom });

  useEffect(() => {
    let cancelled = false;
    loadMapLibre()
      .then((mod) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const opts: MapOptions = {
          container: containerRef.current,
          style: OSM_STYLE as unknown as MapOptions["style"],
          center: [initial.current.center.lng, initial.current.center.lat],
          zoom: initial.current.zoom,
          attributionControl: { compact: true },
          interactive: options?.interactive ?? true,
        };
        const map = new mod.Map(opts);
        map.addControl(new mod.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => {
          if (!cancelled) setReady(true);
        });
        mapRef.current = map;
        setMaplibre(mod);
      })
      .catch((e) => !cancelled && setError(e as Error));

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { containerRef, mapRef, maplibre, ready, error };
}

/** Creates a small circular DOM marker element. */
export function markerEl(color: string, label?: string) {
  const el = document.createElement("div");
  el.style.cssText = `width:20px;height:20px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;cursor:pointer`;
  if (label) el.textContent = label;
  return el;
}
