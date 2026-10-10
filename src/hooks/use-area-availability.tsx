import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Zwits is live in Harare only, so availability is checked there. */
export const SEARCH_AREA = "Harare";

/**
 * Counts of approved, online providers per service in the area.
 * Only fetched once a search is typed (`enabled`), cached for a minute, so the
 * entry screen stays data-light. Informational only — booking re-checks.
 */
export function useAreaAvailability(enabled: boolean) {
  return useQuery({
    queryKey: ["area-availability", SEARCH_AREA],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("available_provider_counts", { _city: SEARCH_AREA });
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data ?? []) map[r.category] = r.available_count;
      return map;
    },
  });
}

export function AvailabilityBadge({
  slug,
  counts,
  loading,
}: {
  slug: string;
  counts?: Record<string, number>;
  loading?: boolean;
}) {
  if (loading || !counts) {
    return <span className="block text-[11px] text-muted-foreground">Checking {SEARCH_AREA}…</span>;
  }
  const n = counts[slug] ?? 0;
  return n > 0 ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
      <span className="size-1.5 rounded-full bg-success" aria-hidden />
      {n} online in {SEARCH_AREA}
    </span>
  ) : (
    <span className="block text-[11px] text-muted-foreground">None online in {SEARCH_AREA} now</span>
  );
}
