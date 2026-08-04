-- 1. Column-level lockdown: verification document paths are no longer selectable
--    by ordinary clients. Row-level policies cannot restrict columns, so we use
--    column privileges. Writes (onboarding uploads) stay allowed.
REVOKE SELECT (id_document_url, selfie_url, business_doc_url) ON public.providers FROM authenticated;
REVOKE SELECT (id_document_url, selfie_url, business_doc_url) ON public.providers FROM anon;
GRANT ALL ON public.providers TO service_role;

-- 2. Explicit, authorized read path for the provider themselves and for admins.
CREATE OR REPLACE FUNCTION public.get_provider_documents(_provider_id uuid)
RETURNS TABLE (id_document_url text, selfie_url text, business_doc_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id_document_url, p.selfie_url, p.business_doc_url
  FROM public.providers p
  WHERE p.id = _provider_id
    AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
$$;

REVOKE ALL ON FUNCTION public.get_provider_documents(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_provider_documents(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_documents(uuid) TO service_role;