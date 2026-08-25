import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PROVIDER_QUERY_KEYS = [
  ["admin-providers"],
  ["admin-online-providers"],
  ["admin-metrics"],
  ["admin-dash-providers"],
] as const;

/**
 * Subscribes to realtime changes on the providers table and invalidates the
 * admin provider queries when a row changes (e.g. a provider toggles online).
 *
 * Returns true while the channel is subscribed. Callers should fall back to
 * lightweight polling whenever this returns false (offline, Realtime
 * unavailable, or channel still connecting).
 */
export function useProvidersRealtime(enabled: boolean, channelSuffix: string): boolean {
  const qc = useQueryClient();
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLive(false);
      return;
    }

    const invalidate = () => {
      for (const queryKey of PROVIDER_QUERY_KEYS) {
        qc.invalidateQueries({ queryKey: [...queryKey] });
      }
    };

    const channel = supabase
      .channel(`admin-providers-live-${channelSuffix}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "providers" },
        invalidate,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setLive(true);
          // Catch up on anything that changed while the socket was connecting.
          invalidate();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setLive(false);
        }
      });

    return () => {
      setLive(false);
      supabase.removeChannel(channel);
    };
  }, [enabled, channelSuffix, qc]);

  return enabled && live;
}
