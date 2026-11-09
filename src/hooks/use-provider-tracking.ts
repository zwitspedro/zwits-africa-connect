import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

/**
 * When `enabled` is true, watches the browser geolocation and publishes
 * position rows into provider_locations for the given booking.
 */
export function useProviderTracking({ bookingId, enabled }: { bookingId: string | null; enabled: boolean }) {
  const { user } = useAuth();
  const lastPush = useRef(0);

  useEffect(() => {
    if (!enabled || !bookingId || !user) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastPush.current < 4000) return; // throttle to ~one row / 4s
        lastPush.current = now;
        const { error } = await supabase.from("provider_locations").upsert({
          booking_id: bookingId,
          provider_user_id: user.id,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading ?? null,
          speed: pos.coords.speed ?? null,
          accuracy: pos.coords.accuracy ?? null,
        }, { onConflict: 'provider_user_id,booking_id' });
        if (error) console.warn('Location sharing unavailable', error.message);
      },
      (err) => console.warn("Geolocation error", err),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 },
    );

    return () => { navigator.geolocation.clearWatch(watchId); lastPush.current = 0; };
  }, [enabled, bookingId, user]);
}
