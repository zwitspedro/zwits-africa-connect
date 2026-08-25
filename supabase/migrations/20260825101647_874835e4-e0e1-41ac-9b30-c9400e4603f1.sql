REVOKE SELECT (revoke_reason) ON public.providers FROM authenticated;
REVOKE SELECT (revoke_reason) ON public.providers FROM anon;

CREATE OR REPLACE FUNCTION public.get_provider_review(_provider_id uuid)
RETURNS TABLE(revoke_reason text, reviewed_at timestamptz, reviewed_by uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT p.revoke_reason, p.reviewed_at, p.reviewed_by
  FROM public.providers p
  WHERE p.id = _provider_id
    AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
$fn$;

REVOKE ALL ON FUNCTION public.get_provider_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_provider_review(uuid) TO authenticated;