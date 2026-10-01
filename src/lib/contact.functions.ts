import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(1).max(4000),
});

/** Public contact form: stores the message for admins, rate limited per IP. */
export const sendContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const { consumeRateLimit } = await import("./auth-otp.server");
    const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for") ?? "unknown";
    const ok = await consumeRateLimit(`contact:${ip}`, 5, 3600);
    if (!ok) throw new Error("Too many messages. Please try again later.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_messages" as any).insert(data as any);
    if (error) throw new Error("Could not send your message. Please try again.");
    return { ok: true };
  });
