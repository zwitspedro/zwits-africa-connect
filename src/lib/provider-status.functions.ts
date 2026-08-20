import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-calculated onboarding state. The dashboard renders this — it never
 * derives readiness from local component state.
 */
export const getProviderReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("provider_readiness", {
      _user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return data as {
      profile_complete: boolean;
      services_complete: boolean;
      service_area_complete: boolean;
      documents_complete: boolean;
      payouts_complete: boolean;
      verified: boolean;
      provider_ready: boolean;
      missing: string[];
    };
  });

/**
 * Going online is server-authoritative: a provider who has not met every
 * requirement is refused, and told exactly what is missing.
 */
export const setProviderOnline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ online: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    if (data.online) {
      const { data: readiness, error } = await context.supabase.rpc("provider_readiness", {
        _user_id: context.userId,
      });
      if (error) throw new Error(error.message);
      const r = readiness as { provider_ready: boolean; missing: string[] };
      if (!r?.provider_ready) {
        return {
          online: false as const,
          blocked: true as const,
          missing: r?.missing ?? ["Complete your provider setup"],
        };
      }
    }

    const { error: upErr } = await db
      .from("providers")
      .update({ available: data.online })
      .eq("user_id", context.userId);
    if (upErr) throw new Error(upErr.message);

    return { online: data.online, blocked: false as const, missing: [] as string[] };
  });
