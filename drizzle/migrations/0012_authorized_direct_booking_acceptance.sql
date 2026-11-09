CREATE OR REPLACE FUNCTION public.accept_direct_booking(_booking_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings; p public.providers; ready jsonb;
BEGIN
 SELECT * INTO b FROM public.bookings WHERE id=_booking_id FOR UPDATE;
 SELECT * INTO p FROM public.providers WHERE id=b.provider_id FOR UPDATE;
 IF auth.uid() IS NULL OR p.user_id IS DISTINCT FROM auth.uid() OR b.fulfilment_mode IS DISTINCT FROM 'direct' THEN RAISE EXCEPTION 'Only the assigned provider can accept this direct booking'; END IF;
 IF b.status='accepted' THEN RETURN jsonb_build_object('ok',true,'idempotent',true); END IF;
 IF b.status<>'pending' THEN RAISE EXCEPTION 'This booking is no longer awaiting acceptance'; END IF;
 IF p.verification_status<>'approved' OR NOT p.available THEN RAISE EXCEPTION 'An approved online provider is required'; END IF;
 ready:=public.provider_readiness(p.user_id);
 IF NOT coalesce((ready->>'documents_complete')::boolean,false) THEN RAISE EXCEPTION 'Verification documents are incomplete or expired'; END IF;
 IF p.category IS DISTINCT FROM b.category AND NOT EXISTS(SELECT 1 FROM public.provider_services ps JOIN public.services s ON s.id=ps.service_id WHERE ps.provider_id=p.id AND ps.active AND s.slug=b.category) THEN RAISE EXCEPTION 'You do not offer this service'; END IF;
 IF NOT public.is_provider_available_at(p.user_id,coalesce(b.scheduled_for,now())) THEN RAISE EXCEPTION 'Provider is unavailable at the requested time'; END IF;
 IF (SELECT count(*) FROM public.bookings WHERE provider_id=p.id AND status IN ('accepted','travelling','provider_arriving','arrived','in_progress'))>=3 THEN RAISE EXCEPTION 'You already have too many active jobs'; END IF;
 PERFORM set_config('zwits.trusted','on',true);
 UPDATE public.bookings SET status='accepted',dispatch_state='assigned',dispatch_updated_at=now() WHERE id=b.id;
 PERFORM public.log_marketplace_event(b.id,'direct_booking_accepted',auth.uid(),jsonb_build_object('provider_id',p.id));
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.accept_direct_booking(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.accept_direct_booking(uuid) TO authenticated,service_role;