import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StatsSchema = z.object({
  businessName: z.string().max(120),
  category: z.string().max(60),
  city: z.string().max(80),
  growthScore: z.number(),
  rating: z.number(),
  ratingsCount: z.number(),
  jobsCompleted: z.number(),
  acceptanceRate: z.number().nullable(),
  responseSeconds: z.number().nullable(),
  completionRate: z.number().nullable(),
  cancellationRate: z.number().nullable(),
  repeatCustomers: z.number(),
  verified: z.boolean(),
  profileCompletion: z.number(),
  weekEarnings: z.number(),
  monthEarnings: z.number(),
  peerResponsePercentile: z.number().nullable(),
  openTasks: z.array(z.string().max(80)).max(12),
});

export type CoachTip = { title: string; detail: string; action: string; impact: "high" | "medium" | "low" };

export const getCoachAdvice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StatsSchema.parse(input))
  .handler(async ({ data }): Promise<{ tips: CoachTip[]; source: "ai" | "rules" }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { tips: fallbackTips(data), source: "rules" };

    const system =
      "You are the Zwits Growth Coach for service providers in Zimbabwe. " +
      "Given a provider's performance metrics, return 4 to 6 short, specific, motivating coaching tips. " +
      "Each tip: a punchy title (max 8 words), a one-sentence detail referencing their actual numbers, " +
      "a concrete next action (max 8 words), and an impact of high, medium or low. " +
      "Be encouraging, never generic, never mention that you are an AI. Reply with JSON only.";

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: JSON.stringify(data) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "coach_tips",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["tips"],
                properties: {
                  tips: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["title", "detail", "action", "impact"],
                      properties: {
                        title: { type: "string" },
                        detail: { type: "string" },
                        action: { type: "string" },
                        impact: { type: "string", enum: ["high", "medium", "low"] },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      });

      if (!res.ok) {
        if (res.status === 429) throw new Error("rate_limited");
        if (res.status === 402) throw new Error("credits");
        throw new Error(`gateway_${res.status}`);
      }

      const json: any = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      const tips: CoachTip[] = Array.isArray(parsed?.tips) ? parsed.tips.slice(0, 6) : [];
      if (!tips.length) return { tips: fallbackTips(data), source: "rules" };
      return { tips, source: "ai" };
    } catch {
      return { tips: fallbackTips(data), source: "rules" };
    }
  });

function fallbackTips(d: z.infer<typeof StatsSchema>): CoachTip[] {
  const tips: CoachTip[] = [];
  if (!d.verified)
    tips.push({
      title: "Verify your identity",
      detail: "Verified providers win noticeably more first-wave job offers than unverified ones.",
      action: "Upload ID and selfie",
      impact: "high",
    });
  if (d.profileCompletion < 100)
    tips.push({
      title: `Your profile is ${d.profileCompletion}% complete`,
      detail: "A complete profile with bio, pricing and photos converts far more customers.",
      action: "Finish your profile",
      impact: "high",
    });
  if (d.responseSeconds != null && d.responseSeconds > 20)
    tips.push({
      title: "Respond faster to offers",
      detail: `You average ${Math.round(d.responseSeconds)}s to answer job offers — the fastest providers answer inside 15s.`,
      action: "Enable job alerts",
      impact: "high",
    });
  else if (d.peerResponsePercentile != null)
    tips.push({
      title: "You're a fast responder",
      detail: `You respond faster than ${d.peerResponsePercentile}% of providers in ${d.city}.`,
      action: "Keep it up",
      impact: "low",
    });
  if (d.acceptanceRate != null && d.acceptanceRate < 60)
    tips.push({
      title: "You've declined nearby jobs",
      detail: `Your acceptance rate is ${Math.round(d.acceptanceRate)}%. Dispatch sends more jobs to providers who say yes.`,
      action: "Accept more nearby jobs",
      impact: "medium",
    });
  if (d.repeatCustomers < 3)
    tips.push({
      title: "Turn jobs into regulars",
      detail: "Sending a thank-you message after each job is the cheapest way to earn repeat bookings.",
      action: "Message past customers",
      impact: "medium",
    });
  if (d.rating < 4.7 && d.ratingsCount > 0)
    tips.push({
      title: `Lift your ${d.rating.toFixed(1)}★ rating`,
      detail: "Confirming arrival times and sharing finished-work photos reliably raises ratings.",
      action: "Share job photos in chat",
      impact: "medium",
    });
  tips.push({
    title: "Cover weekend demand",
    detail: `Customers in ${d.city} search for ${d.category} most on weekends — add Saturday hours.`,
    action: "Update working hours",
    impact: "medium",
  });
  return tips.slice(0, 6);
}
