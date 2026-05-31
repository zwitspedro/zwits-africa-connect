import { useEffect, useState } from "react";

const KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const CHANNEL = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

let loader: Promise<typeof google> | null = null;

function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (loader) return loader;
  if (!KEY) return Promise.reject(new Error("Google Maps key missing"));

  loader = new Promise((resolve, reject) => {
    (window as any).__initGoogleMaps = () => resolve((window as any).google);
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key: KEY,
      libraries: "places",
      loading: "async",
      callback: "__initGoogleMaps",
      v: "weekly",
    });
    if (CHANNEL) params.set("channel", CHANNEL);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return loader;
}

export function useGoogleMaps() {
  const [ready, setReady] = useState<boolean>(typeof window !== "undefined" && !!(window as any).google?.maps);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    if (ready) return;
    loadGoogleMaps().then(() => setReady(true)).catch(setError);
  }, [ready]);
  return { ready, error };
}
