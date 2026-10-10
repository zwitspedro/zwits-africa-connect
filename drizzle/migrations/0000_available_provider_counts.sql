-- Aggregate-only availability for search results: exposes counts per category, never provider rows.
CREATE OR REPLACE FUNCTION public.available_provider_counts(_city text)
RETURNS TABLE(category text, available_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.category, count(*)::int
  FROM public.providers p
  WHERE p.verification_status = 'approved'
    AND p.available = true
    AND length(coalesce(_city, '')) BETWEEN 2 AND 60
    AND p.city ILIKE '%' || _city || '%'
  GROUP BY p.category
$$;
REVOKE ALL ON FUNCTION public.available_provider_counts(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.available_provider_counts(text) TO anon, authenticated;