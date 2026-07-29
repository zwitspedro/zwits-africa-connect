import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProviderData } from "../use-provider-data";

export type ChecklistTask = { key: string; label: string; done: boolean; xp: number; hint?: string };

export function useGrowth(data: ProviderData) {
  const { provider, profile, jobs, completed, reviews, performance, earnings } = data;

  const peersQuery = useQuery({
    queryKey: ["growth-peers", provider?.city, provider?.category],
    enabled: !!provider?.city,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("providers")
        .select("id, business_name, city, category, rating_avg, ratings_count, jobs_completed")
        .eq("verification_status", "approved")
        .limit(500);
      if (error) throw error;
      return rows ?? [];
    },
  });

  return useMemo(() => {
    const peers = peersQuery.data ?? [];

    /* ---------- profile completion ---------- */
    const profileBits = [
      !!profile?.display_name,
      !!profile?.phone,
      !!profile?.avatar_url,
      !!provider?.business_name,
      !!provider?.bio && provider.bio.length > 40,
      !!provider?.city,
      Number(provider?.hourly_rate ?? 0) > 0,
      provider?.verification_status === "approved",
    ];
    const profileCompletion = Math.round((profileBits.filter(Boolean).length / profileBits.length) * 100);

    /* ---------- growth score ---------- */
    const norm = (v: number | null, max: number) => (v == null ? 0 : Math.max(0, Math.min(1, v / max)));
    const responseScore =
      performance.avgResponseSeconds == null ? 0.5 : Math.max(0, Math.min(1, 1 - performance.avgResponseSeconds / 60));
    const portfolioPhotos = completed.reduce((s: number, j: any) => s + (j.photos?.length ?? 0), 0);

    const components = [
      { key: "Profile completion", weight: 15, value: profileCompletion / 100 },
      { key: "Customer ratings", weight: 20, value: norm(Number(provider?.rating_avg ?? 0), 5) },
      { key: "Response time", weight: 12, value: responseScore },
      { key: "Acceptance rate", weight: 12, value: norm(performance.acceptanceRate, 100) },
      { key: "Completion rate", weight: 15, value: norm(performance.completionRate, 100) },
      { key: "Repeat customers", weight: 10, value: norm(performance.repeatCustomers, 10) },
      { key: "Portfolio quality", weight: 6, value: norm(portfolioPhotos, 10) },
      { key: "Verification", weight: 10, value: provider?.verification_status === "approved" ? 1 : 0 },
    ];
    const growthScore = Math.round(components.reduce((s, c) => s + c.weight * c.value, 0));

    /* ---------- checklist ---------- */
    const tasks: ChecklistTask[] = [
      { key: "profile", label: "Complete your profile", done: profileCompletion >= 90, xp: 100 },
      { key: "logo", label: "Upload a business logo or photo", done: !!profile?.avatar_url, xp: 50 },
      { key: "portfolio", label: "Add five portfolio images", done: portfolioPhotos >= 5, xp: 120, hint: `${portfolioPhotos}/5 job photos` },
      { key: "phone", label: "Verify your phone number", done: !!profile?.phone, xp: 60 },
      { key: "identity", label: "Verify your identity", done: provider?.verification_status === "approved", xp: 200 },
      { key: "hours", label: "Add working hours", done: typeof window !== "undefined" && !!localStorage.getItem("zwits.provider.availability"), xp: 60 },
      { key: "pricing", label: "Add service pricing", done: Number(provider?.hourly_rate ?? 0) > 0, xp: 80 },
      { key: "inquiries", label: "Respond to five customer inquiries", done: (performance.offersReceived ?? 0) >= 5, xp: 90, hint: `${performance.offersReceived} offers handled` },
      { key: "firstjob", label: "Complete your first job", done: completed.length >= 1, xp: 150 },
    ];
    const xpEarned = tasks.filter((t) => t.done).reduce((s, t) => s + t.xp, 0);
    const xpTotal = tasks.reduce((s, t) => s + t.xp, 0);
    const level = Math.floor(xpEarned / 250) + 1;

    /* ---------- analytics series ---------- */
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const bookingsByDay = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const key = d.toDateString();
      return {
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        bookings: jobs.filter((j: any) => new Date(j.created_at).toDateString() === key).length,
      };
    });

    const monthly = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i), 1);
      const inMonth = (x: any) => {
        const t = new Date(x.created_at);
        return t.getMonth() === d.getMonth() && t.getFullYear() === d.getFullYear();
      };
      const done = completed.filter(inMonth);
      return {
        label: d.toLocaleDateString(undefined, { month: "short" }),
        bookings: jobs.filter(inMonth).length,
        customers: new Set(done.map((j: any) => j.customer_id)).size,
      };
    });

    const byWeekday = dayNames.map((name, idx) => ({
      label: name,
      bookings: jobs.filter((j: any) => new Date(j.created_at).getDay() === idx).length,
    }));

    const byHour = Array.from({ length: 24 }, (_, h) => ({
      label: `${h}`,
      bookings: jobs.filter((j: any) => new Date(j.scheduled_for ?? j.created_at).getHours() === h).length,
    }));

    /* ---------- opportunities ---------- */
    const countBy = <T,>(arr: T[], pick: (x: T) => string) => {
      const m = new Map<string, number>();
      for (const x of arr) {
        const k = pick(x);
        if (k) m.set(k, (m.get(k) ?? 0) + 1);
      }
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    const topServices = countBy(jobs as any[], (j) => j.category).slice(0, 5);
    const revenueByCategory = new Map<string, number>();
    for (const j of completed as any[]) {
      revenueByCategory.set(j.category, (revenueByCategory.get(j.category) ?? 0) + (Number(j.price) || 0));
    }
    const topCategoryByRevenue = [...revenueByCategory.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const suburbs = countBy(jobs as any[], (j) => String(j.address ?? "").split(",")[0].trim()).slice(0, 5);
    const bestHour = [...byHour].sort((a, b) => b.bookings - a.bookings)[0];
    const peakDay = [...byWeekday].sort((a, b) => b.bookings - a.bookings)[0];
    const avgJobValue = completed.length
      ? completed.reduce((s: number, j: any) => s + (Number(j.price) || 0), 0) / completed.length
      : 0;
    const peerAvgJobs = peers.length ? peers.reduce((s, p: any) => s + (p.jobs_completed ?? 0), 0) / peers.length : 0;

    /* ---------- reputation ---------- */
    const avgRating = Number(provider?.rating_avg ?? 0);
    const satisfaction = reviews.length
      ? Math.round((reviews.filter((r: any) => r.rating >= 4).length / reviews.length) * 100)
      : 0;
    const scores = {
      reliability: Math.round((performance.completionRate ?? 0)),
      professionalism: Math.round(Math.min(100, avgRating * 20)),
      punctuality: Math.round(Math.max(0, 100 - (performance.cancellationRate ?? 0) * 2)),
      quality: Math.round(Math.min(100, satisfaction)),
      responseQuality: Math.round((performance.responseRate ?? 0)),
    };

    /* ---------- ranking ---------- */
    const rankIn = (list: any[]) => {
      const sorted = [...list].sort(
        (a, b) => Number(b.rating_avg) * 20 + b.jobs_completed - (Number(a.rating_avg) * 20 + a.jobs_completed),
      );
      const idx = sorted.findIndex((p) => p.id === provider?.id);
      return { rank: idx >= 0 ? idx + 1 : null, total: sorted.length, top: sorted.slice(0, 5) };
    };
    const cityPeers = peers.filter((p: any) => p.city === provider?.city);
    const categoryPeers = peers.filter((p: any) => p.category === provider?.category);
    const ranking = {
      city: rankIn(cityPeers),
      national: rankIn(peers),
      category: rankIn(categoryPeers),
    };
    const peerResponsePercentile =
      performance.avgResponseSeconds == null ? null : Math.max(50, Math.min(99, Math.round(100 - performance.avgResponseSeconds * 1.5)));

    /* ---------- achievements ---------- */
    const achievements = [
      { key: "first", label: "First Job", earned: completed.length >= 1, hint: "Complete 1 job" },
      { key: "ten", label: "10 Happy Customers", earned: completed.length >= 10, hint: "Complete 10 jobs" },
      { key: "hundred", label: "100 Completed Jobs", earned: completed.length >= 100, hint: "Complete 100 jobs" },
      { key: "fast", label: "Fast Responder", earned: (performance.avgResponseSeconds ?? 999) < 15, hint: "Respond under 15s" },
      { key: "rated", label: "Highly Rated", earned: avgRating >= 4.8 && (provider?.ratings_count ?? 0) >= 5, hint: "4.8★ over 5 reviews" },
      { key: "top", label: "Top Provider", earned: (ranking.city.rank ?? 99) <= 3, hint: "Top 3 in your city" },
      { key: "verified", label: "Verified Expert", earned: provider?.verification_status === "approved", hint: "Complete verification" },
      { key: "community", label: "Community Champion", earned: performance.repeatCustomers >= 5, hint: "5 repeat customers" },
      { key: "elite", label: "Elite Professional", earned: growthScore >= 85, hint: "Growth score 85+" },
    ];

    /* ---------- earnings insights ---------- */
    const dayTotals = new Map<string, number>();
    for (const j of completed as any[]) {
      const k = new Date(j.completed_at ?? j.updated_at ?? j.created_at).toDateString();
      dayTotals.set(k, (dayTotals.get(k) ?? 0) + (Number(j.price) || 0));
    }
    const bestDay = [...dayTotals.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const suggestedRate = avgJobValue > 0 && avgRating >= 4.7 ? avgJobValue * 1.1 : avgJobValue;

    return {
      peersLoading: peersQuery.isLoading,
      growthScore,
      components,
      profileCompletion,
      tasks,
      xpEarned,
      xpTotal,
      level,
      analytics: { bookingsByDay, monthly, byWeekday, byHour, trend: earnings.trend },
      opportunities: { topServices, topCategoryByRevenue, suburbs, bestHour, peakDay, avgJobValue, peerAvgJobs },
      reputation: { avgRating, satisfaction, scores, reviews },
      ranking,
      peerResponsePercentile,
      achievements,
      insights: {
        bestDay,
        avgJobValue,
        suggestedRate,
        commissionPaid: earnings.fees,
        week: earnings.week,
        month: earnings.month,
      },
    };
  }, [provider, profile, jobs, completed, reviews, performance, earnings, peersQuery.data, peersQuery.isLoading]);
}

export type GrowthData = ReturnType<typeof useGrowth>;
