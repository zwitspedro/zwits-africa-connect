import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  providerId: z.string().uuid(),
  dayStartIso: z.string().datetime(),
  dayEndIso: z.string().datetime(),
});

/**
 * Returns booked start times for a provider on a given day.
 * Requires an authenticated caller; uses the admin client so customers can see
 * real availability without exposing any other customer's PII — only
 * `scheduled_for` is returned.
 */
export const getProviderBusySlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("bookings")
      .select("scheduled_for, status")
      .eq("provider_id", data.providerId)
      .in("status", ["pending", "accepted", "in_progress"])
      .gte("scheduled_for", data.dayStartIso)
      .lt("scheduled_for", data.dayEndIso);
    if (error) throw new Error(error.message);
    return (rows ?? [])
      .filter((r) => r.scheduled_for)
      .map((r) => ({ start: r.scheduled_for as string }));
  });
