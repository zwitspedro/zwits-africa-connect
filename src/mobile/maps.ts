/**
 * Maps module — location permissions, live position and shared map defaults.
 *
 * Uses Capacitor Geolocation on device (background-friendly, permission-aware)
 * and the browser Geolocation API on web. Tiles and geometry helpers come from
 * the existing MapLibre/OSM config so web and mobile render identically.
 */
import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  OSM_STYLE,
  haversineMeters,
  formatDistance,
  formatEta,
  type LatLng,
} from "@/lib/map-config";
import { nativeOnly, isNative } from "./platform";

export { DEFAULT_CENTER, DEFAULT_ZOOM, OSM_STYLE, haversineMeters, formatDistance, formatEta };
export type { LatLng };

export type PermissionState = "granted" | "denied" | "prompt" | "unknown";

export async function requestLocationPermission(): Promise<PermissionState> {
  const mod = await nativeOnly(() => import("@capacitor/geolocation"));
  if (!mod) return typeof navigator !== "undefined" && "geolocation" in navigator ? "prompt" : "denied";
  try {
    const res = await mod.Geolocation.requestPermissions();
    return (res.location as PermissionState) ?? "unknown";
  } catch {
    return "denied";
  }
}

export async function currentPosition(): Promise<LatLng | null> {
  const mod = await nativeOnly(() => import("@capacitor/geolocation"));
  if (mod) {
    try {
      const p = await mod.Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10_000 });
      return { lat: p.coords.latitude, lng: p.coords.longitude };
    } catch {
      return null;
    }
  }
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
}

/** Continuous position updates — used by driver/provider tracking screens. */
export function useLiveLocation(enabled = true) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    const start = async () => {
      const mod = await nativeOnly(() => import("@capacitor/geolocation"));
      if (mod) {
        const id = await mod.Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 15_000 },
          (p, err) => {
            if (!alive) return;
            if (err || !p) return setError(err?.message ?? "Location unavailable");
            setPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
          },
        );
        cleanup.current = () => void mod.Geolocation.clearWatch({ id });
        return;
      }
      if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
      const id = navigator.geolocation.watchPosition(
        (p) => alive && setPosition({ lat: p.coords.latitude, lng: p.coords.longitude }),
        (e) => alive && setError(e.message),
        { enableHighAccuracy: true },
      );
      cleanup.current = () => navigator.geolocation.clearWatch(id);
    };

    void start();
    return () => {
      alive = false;
      cleanup.current?.();
      cleanup.current = null;
    };
  }, [enabled]);

  return { position, error };
}

/** Opens turn-by-turn navigation in the device's maps app. */
export function openNavigation(dest: LatLng) {
  const url = isNative()
    ? `geo:${dest.lat},${dest.lng}?q=${dest.lat},${dest.lng}`
    : `https://www.openstreetmap.org/directions?to=${dest.lat},${dest.lng}`;
  if (typeof window !== "undefined") window.open(url, "_system");
}
