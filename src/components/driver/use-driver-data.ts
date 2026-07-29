import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { driverPayout } from "@/lib/delivery-config";

export type DeliveryRow = {
  id: string;
  customer_id: string;
  driver_id: string | null;
  service_tier: string;
  parcel_size: string;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  notes: string | null;
  price: number | null;
  distance_km: number | null;
  status: string;
  created_at: string;
  delivered_at: string | null;
};

export function useDriverData() {
  const { user } = useAuth();

  const profile = useQuery({
    queryKey: ["driver-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const vehicles = useQuery({
    queryKey: ["driver-vehicles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const deliveries = useQuery({
    queryKey: ["driver-deliveries", user?.id],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("*")
        .eq("driver_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as DeliveryRow[];
    },
  });

  const rows = deliveries.data ?? [];
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const done = rows.filter((d) => d.status === "delivered");
  const today = done.filter((d) => new Date(d.delivered_at ?? d.created_at) >= startOfDay);
  const active = rows.filter((d) => d.status === "accepted" || d.status === "picked_up");

  const sum = (list: DeliveryRow[]) => list.reduce((t, d) => t + driverPayout(d.price), 0);
  const km = (list: DeliveryRow[]) => list.reduce((t, d) => t + Number(d.distance_km ?? 0), 0);

  return {
    user,
    profile,
    vehicles,
    deliveries,
    rows,
    active,
    completed: done,
    metrics: {
      todayCount: today.length,
      todayEarnings: sum(today),
      todayKm: Math.round(km(today) * 10) / 10,
      totalEarnings: sum(done),
      totalCount: done.length,
      rating: profile.data?.rating_avg ?? 0,
    },
  };
}
