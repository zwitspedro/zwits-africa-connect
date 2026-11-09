import { getRequest } from "@tanstack/react-start/server";
export async function sendProviderDecision(eventId: string, _actorId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: event, error } = await supabaseAdmin.from("provider_review_events").select("id,email_state").eq("id", eventId).single();
  if (error || !event) return { emailState: "failed" };
  if (["queued", "sent", "suppressed"].includes(event.email_state)) return { emailState: event.email_state };
  const request = getRequest();
  const response = await fetch(new URL("/lovable/email/transactional/send", request.url), { method: "POST", headers: { "Content-Type": "application/json", "Authorization": request.headers.get("Authorization") ?? "" }, body: JSON.stringify({ templateName: "provider-decision", templateData: { eventId }, idempotencyKey: `provider-decision:${eventId}` }) });
  if (!response.ok) {
    await supabaseAdmin.from("provider_review_events").update({ email_state: "failed" }).eq("id", eventId);
    return { emailState: "failed" };
  }
  const result = await response.json() as { queued?: boolean; reason?: string };
  return { emailState: result.queued ? "queued" : result.reason === "email_suppressed" ? "suppressed" : result.reason === "already_processing" ? "queueing" : "failed" };
}