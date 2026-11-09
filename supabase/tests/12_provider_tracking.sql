-- Read existing fixtures; all tracking writes are rolled back.
BEGIN;
DO $$
DECLARE admin_id uuid; provider_id uuid; bid uuid; location_id uuid; original_time timestamptz; result jsonb;
BEGIN
 SELECT user_id INTO admin_id FROM public.user_roles WHERE role='admin' ORDER BY created_at LIMIT 1;
 SELECT l.id,l.booking_id,l.provider_user_id,l.updated_at INTO location_id,bid,provider_id,original_time
 FROM public.provider_locations l JOIN public.bookings b ON b.id=l.booking_id JOIN public.providers p ON p.id=b.provider_id
 WHERE p.user_id=l.provider_user_id AND b.status::text IN ('accepted','travelling','provider_arriving','arrived','in_progress') LIMIT 1;
 IF admin_id IS NULL OR bid IS NULL THEN RAISE EXCEPTION 'Tracking fixture unavailable'; END IF;
 PERFORM set_config('request.jwt.claim.sub',admin_id::text,true);
 IF has_function_privilege('anon','public.admin_dispatch_locations()','execute') OR NOT has_function_privilege('authenticated','public.admin_dispatch_locations()','execute') THEN RAISE EXCEPTION 'FAIL location directory grants'; END IF;
 PERFORM set_config('request.jwt.claim.sub',provider_id::text,true);
 INSERT INTO public.provider_locations(booking_id,provider_user_id,lat,lng)
 VALUES(bid,provider_id,-17.8252,31.0335)
 ON CONFLICT(provider_user_id,booking_id) DO UPDATE SET lat=excluded.lat,lng=excluded.lng;
 IF NOT EXISTS(SELECT 1 FROM public.provider_locations WHERE id=location_id AND lat=-17.8252 AND lng=31.0335 AND updated_at>original_time) THEN RAISE EXCEPTION 'FAIL current location upsert timestamp'; END IF;
END $$;
ROLLBACK;