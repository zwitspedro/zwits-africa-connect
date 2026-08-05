/**
 * API layer for the shared mobile core.
 *
 * One place that knows how to talk to the backend, so the three Android apps
 * never hand-roll queries. Reads go through the browser Supabase client (RLS
 * applies as the signed-in user); privileged flows keep using the existing
 * server functions.
 */
import { supabase } from "@/integrations/supabase/client";

export type ApiResult<T> = { data: T; error: null } | { data: null; error: Error };

type Queryable<T> = PromiseLike<{ data: T | null; error: { message?: string } | null }>;

async function run<T>(fn: () => Queryable<T>): Promise<T> {
  const { data, error } = await fn();
  if (error) throw new Error(error.message ?? "Request failed");
  return data as T;
}

/** Stable query keys — shared by the offline cache and every screen. */
export const qk = {
  profile: (userId: string) => ["mobile", "profile", userId] as const,
  roles: (userId: string) => ["mobile", "roles", userId] as const,
  bookings: (userId: string) => ["mobile", "bookings", userId] as const,
  booking: (id: string) => ["mobile", "booking", id] as const,
  deliveries: (userId: string) => ["mobile", "deliveries", userId] as const,
  providerJobs: (providerId: string) => ["mobile", "provider-jobs", providerId] as const,
  notifications: (userId: string) => ["mobile", "notifications", userId] as const,
  messages: (bookingId: string) => ["mobile", "messages", bookingId] as const,
  settings: (userId: string) => ["mobile", "settings", userId] as const,
};

export const api = {
  /** Customer: my bookings, newest first. */
  bookings: (userId: string) =>
    run(() =>
      supabase
        .from("bookings")
        .select("*")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ),

  booking: (id: string) => run(() => supabase.from("bookings").select("*").eq("id", id).maybeSingle()),

  /** Customer: my deliveries. */
  deliveries: (userId: string) =>
    run(() =>
      supabase
        .from("deliveries")
        .select("*")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ),

  /** Driver: deliveries assigned to me. */
  driverDeliveries: (userId: string) =>
    run(() =>
      supabase
        .from("deliveries")
        .select("*")
        .eq("driver_id", userId)
        .order("created_at", { ascending: false })
        .limit(200),
    ),

  /** Provider: jobs assigned to my provider record. */
  providerJobs: (providerId: string) =>
    run(() =>
      supabase
        .from("bookings")
        .select("*")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false })
        .limit(200),
    ),

  notifications: (userId: string) =>
    run(() =>
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ),

  messages: (bookingId: string) =>
    run(() =>
      supabase
        .from("messages")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true })
        .limit(200),
    ),

  profile: (userId: string) =>
    run(() =>
      supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, phone")
        .eq("user_id", userId)
        .maybeSingle(),
    ),
};
