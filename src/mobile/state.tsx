/**
 * State management for the shared mobile core.
 *
 * A single QueryClient tuned for mobile networks, with a read-only offline
 * cache: successful reads are persisted so a cold or offline launch renders
 * last-known data instantly. Writes are never queued — they require
 * connectivity and surface a clear error when offline.
 */
import type { ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

/** How long cached reads stay usable offline. */
export const OFFLINE_CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24h

export function createMobileQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: OFFLINE_CACHE_MAX_AGE,
        retry: 2,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        networkMode: "offlineFirst",
      },
      mutations: {
        // Read-only offline: mutations fail fast instead of queueing.
        networkMode: "online",
        retry: 0,
      },
    },
  });
}

function persister() {
  if (typeof window === "undefined") return null;
  return createSyncStoragePersister({
    storage: window.localStorage,
    key: "zwits.query-cache",
    throttleTime: 1000,
  });
}

/**
 * Wraps the mobile app with the query client + persisted read cache.
 * Falls back to no persistence during SSR.
 */
export function MobileStateProvider({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}) {
  const p = persister();
  if (!p) return <>{children}</>;

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister: p,
        maxAge: OFFLINE_CACHE_MAX_AGE,
        // Never persist anything that could hold a credential.
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const key = JSON.stringify(query.queryKey);
            if (key.includes("session") || key.includes("token")) return false;
            return query.state.status === "success";
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
