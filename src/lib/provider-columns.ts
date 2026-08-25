import { supabase } from "@/integrations/supabase/client";

/**
 * Every provider column EXCEPT the verification-document storage paths and the
 * internal review metadata.
 *
 * `id_document_url` / `selfie_url` / `business_doc_url` / `revoke_reason` are
 * revoked at the column-privilege level for `anon` and `authenticated`, so any
 * `select("*")` against `providers` from the browser now fails. Marketplace
 * discovery and profile display use this projection instead.
 */
export const PROVIDER_SAFE_COLUMNS =
  "id, user_id, business_name, category, bio, city, hourly_rate, verified, available, rating_avg, ratings_count, jobs_completed, verification_status, submitted_at, reviewed_at, reviewed_by, onboarding_completed_at, created_at, updated_at";

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

export type ProviderReview = {
  revoke_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

const EMPTY_REVIEW: ProviderReview = {
  revoke_reason: null,
  reviewed_at: null,
  reviewed_by: null,
};

/**
 * Authorized read of a provider's review metadata (including the internal
 * revoke reason). The database function only returns rows for the provider
 * themselves or an admin, so anyone else gets nulls.
 */
export async function fetchProviderReview(providerId: string): Promise<ProviderReview> {
  const { data, error } = await supabase.rpc("get_provider_review", { _provider_id: providerId });
  if (error) throw error;
  const row = (data as ProviderReview[] | null)?.[0];
  return row ?? EMPTY_REVIEW;
}
