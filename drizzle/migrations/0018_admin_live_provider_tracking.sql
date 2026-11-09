CREATE POLICY "Admins read provider tracking" ON public.provider_locations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS provider_locations_booking_latest_idx ON public.provider_locations (booking_id, updated_at DESC);
CREATE OR REPLACE FUNCTION public.admin_dispatch_locations() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('rows',coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb),'total',(SELECT count(*) FROM public.bookings b WHERE b.provider_id IS NOT NULL AND b.status::text IN ('accepted','travelling','provider_arriving','arrived','in_progress'))) INTO result
 FROM (SELECT b.id AS booking_id,p.business_name AS provider_name,b.status::text AS status,b.address,l.lat,l.lng,l.updated_at,l.accuracy
 FROM public.bookings b JOIN public.providers p ON p.id=b.provider_id
 LEFT JOIN LATERAL (SELECT pl.lat,pl.lng,pl.updated_at,pl.accuracy FROM public.provider_locations pl WHERE pl.booking_id=b.id AND pl.provider_user_id=p.user_id ORDER BY pl.updated_at DESC LIMIT 1) l ON true
 WHERE b.status::text IN ('accepted','travelling','provider_arriving','arrived','in_progress')
 ORDER BY b.updated_at DESC,b.id LIMIT 100) t;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_dispatch_locations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dispatch_locations() TO authenticated, service_role;