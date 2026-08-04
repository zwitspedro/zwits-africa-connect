import { supabase } from "@/integrations/supabase/client";

/**
 * Every provider column EXCEPT the verification-document storage paths.
 *
 * `id_document_url` / `selfie_url` / `business_doc_url` are revoked at the
 * column-privilege level for `anon` and `authenticated`, so any `select("*")`
 * against `providers` from the browser now fails. Marketplace discovery and
 * profile display use this projection instead.
 */
export const PROVIDER_SAFE_COLUMNS =
  "id, user_id, business_name, category, bio, city, hourly_rate, verified, available, rating_avg, ratings_count, jobs_completed, verification_status, submitted_at, reviewed_at, reviewed_by, revoke_reason, onboarding_completed_at, created_at, updated_at";

export type ProviderDocuments = {
  id_document_url: string | null;
  selfie_url: string | null;
  business_doc_url: string | null;
};

const EMPTY_DOCS: ProviderDocuments = {
  id_document_url: null,
  selfie_url: null,
  business_doc_url: null,
};

/**
 * Authorized read of a provider's verification-document paths. The database
 * function only returns rows for the provider themselves or an admin, so an
 * ordinary signed-in user gets nulls for anyone else.
 */
export async function fetchProviderDocuments(providerId: string): Promise<ProviderDocuments> {
  const { data, error } = await supabase.rpc("get_provider_documents", { _provider_id: providerId });
  if (error) throw error;
  const row = (data as ProviderDocuments[] | null)?.[0];
  return row ?? EMPTY_DOCS;
}
