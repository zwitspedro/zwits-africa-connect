import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REVIEW_DOC_KEYS, validateReviewDocument } from "./provider-review-rules";

export const uploadProviderReviewDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: FormData) => {
    if (!(input instanceof FormData)) throw new Error("A document is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Forbidden");
    const providerId = z.string().uuid().parse(data.get("providerId"));
    const key = z.enum(REVIEW_DOC_KEYS).parse(data.get("docKey"));
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("Choose a document");
    const { sniffFileType } = await import("./secure-upload");
    const mime = await sniffFileType(file);
    validateReviewDocument(key, file.size, mime ?? "");
    const { data: provider, error } = await context.supabase.from("providers").select("id,user_id").eq("id", providerId).single();
    if (error || !provider) throw new Error("Provider not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const path = `${provider.user_id}/admin-review/${key}-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabaseAdmin.storage.from("provider-verification").upload(path, await file.arrayBuffer(), { contentType: mime ?? undefined, upsert: false });
    if (uploadError) throw new Error("Document upload failed. Please retry.");
    const { error: registrationError } = await context.supabase.rpc("admin_register_provider_document", { _provider_id: providerId, _doc_key: key, _path: path, _file_name: file.name, _file_size: file.size, _mime: mime ?? "" });
    if (registrationError) {
      await supabaseAdmin.storage.from("provider-verification").remove([path]);
      throw new Error("Document could not be saved to this profile.");
    }
    return { ok: true, status: "pending" };
  });

export const requestProviderDecisionEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !admin) throw new Error("Forbidden");
    const { sendProviderDecision } = await import("./provider-review-email.server");
    return sendProviderDecision(data.eventId, context.userId);
  });