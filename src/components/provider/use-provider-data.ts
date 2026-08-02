import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isOpen } from "@/lib/job-lifecycle";
import { buildProviderOnboarding } from "./use-provider-onboarding";

export type Booking = any;

export function useProviderData() {
  const { user } = useAuth();

  const providerQuery = useQuery({
    queryKey: ["my-provider", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const provider = providerQuery.data;

  const profileQuery = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, phone")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const jobsQuery = useQuery({
    queryKey: ["provider-jobs", provider?.id],
    enabled: !!provider?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("provider_id", provider!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const ratesQuery = useQuery({
    queryKey: ["commission-rates-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_rates")
        .select("category,percent,min_fee,active")
        .eq("active", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const reviewsQuery = useQuery({
    queryKey: ["provider-reviews", provider?.id],
    enabled: !!provider?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ratings")
        .select("id, rating, review, created_at")
        .eq("provider_id", provider!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const offersQuery = useQuery({
    queryKey: ["provider-offer-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_offers")
        .select("id, status, offered_at, responded_at")
        .eq("provider_user_id", user!.id)
        .order("offered_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ["provider-notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, link, kind, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const documentsQuery = useQuery({
    queryKey: ["provider-doc-audits", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_document_audits")
        .select("id, doc_key, file_name, status, created_at, errors")
        .eq("provider_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const jobs: Booking[] = jobsQuery.data ?? [];
  const rates = ratesQuery.data ?? [];

  const derived = useMemo(() => {
    const rateByCategory = new Map(rates.map((r: any) => [r.category, r]));
    const feeFor = (category: string, price: number) => {
      const r: any = rateByCategory.get(category);
      if (!r) return 0;
      return (price * Number(r.percent)) / 100 + Number(r.min_fee);
    };
    const netFor = (j: Booking) => {
      const price = Number(j.price) || 0;
      return price - feeFor(j.category, price);
    };

    const active = jobs.filter((j) => ["pending", "accepted", "in_progress"].includes(j.status));
    const completed = jobs.filter((j) => j.status === "completed");
    const cancelled = jobs.filter((j) => j.status === "cancelled");

    const gross = completed.reduce((s, j) => s + (Number(j.price) || 0), 0);
    const fees = completed.reduce((s, j) => s + feeFor(j.category, Number(j.price) || 0), 0);
    const net = gross - fees;
    const released = completed.filter((j) => j.customer_confirmed_at).reduce((s, j) => s + netFor(j), 0);
    const pending = net - released;

    const dayKey = (d: Date) => d.toDateString();
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const dateOf = (j: Booking) => new Date(j.completed_at ?? j.updated_at ?? j.created_at);
    const today = completed.filter((j) => dayKey(dateOf(j)) === dayKey(now)).reduce((s, j) => s + netFor(j), 0);
    const week = completed.filter((j) => dateOf(j) >= startOfWeek).reduce((s, j) => s + netFor(j), 0);
    const month = completed.filter((j) => dateOf(j) >= startOfMonth).reduce((s, j) => s + netFor(j), 0);

    // last 8 weeks trend
    const trend: { label: string; net: number; gross: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(startOfWeek);
      start.setDate(startOfWeek.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      const inRange = completed.filter((j) => dateOf(j) >= start && dateOf(j) < end);
      trend.push({
        label: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        net: Number(inRange.reduce((s, j) => s + netFor(j), 0).toFixed(2)),
        gross: Number(inRange.reduce((s, j) => s + (Number(j.price) || 0), 0).toFixed(2)),
      });
    }

    const offers = offersQuery.data ?? [];
    const answered = offers.filter((o: any) => ["accepted", "declined", "quoted"].includes(o.status));
    const acceptanceRate = offers.length
      ? (offers.filter((o: any) => ["accepted", "quoted"].includes(o.status)).length / offers.length) * 100
      : null;
    const responseRate = offers.length ? (answered.length / offers.length) * 100 : null;
    const responseTimes = answered
      .filter((o: any) => o.responded_at)
      .map((o: any) => (new Date(o.responded_at).getTime() - new Date(o.offered_at).getTime()) / 1000)
      .filter((s: number) => s >= 0 && s < 3600);
    const avgResponseSeconds = responseTimes.length
      ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length
      : null;

    const finished = completed.length + cancelled.length;
    const completionRate = finished ? (completed.length / finished) * 100 : null;
    const cancellationRate = finished ? (cancelled.length / finished) * 100 : null;

    const customerCounts = new Map<string, number>();
    for (const j of completed) customerCounts.set(j.customer_id, (customerCounts.get(j.customer_id) ?? 0) + 1);
    const repeatCustomers = [...customerCounts.values()].filter((c) => c > 1).length;

    return {
      active,
      completed,
      cancelled,
      feeFor,
      netFor,
      rateByCategory,
      earnings: { gross, fees, net, released, pending, today, week, month, trend },
      performance: {
        acceptanceRate,
        responseRate,
        avgResponseSeconds,
        completionRate,
        cancellationRate,
        repeatCustomers,
        offersReceived: offers.length,
      },
    };
  }, [jobs, rates, offersQuery.data]);

  return {
    user,
    provider,
    profile: profileQuery.data,
    jobs,
    reviews: reviewsQuery.data ?? [],
    notifications: notificationsQuery.data ?? [],
    documents: documentsQuery.data ?? [],
    isLoading: providerQuery.isLoading,
    ...derived,
  };
}

export type ProviderData = ReturnType<typeof useProviderData>;
