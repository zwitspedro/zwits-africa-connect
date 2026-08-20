CREATE OR REPLACE FUNCTION public.accept_job_offer(_offer_id uuid, _user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  o RECORD;
  b RECORD;
  p RECORD;
  v_booking uuid;
  v_ready jsonb;
  v_open int;
  v_claimed uuid;
BEGIN
  IF NOT public.is_trusted_writer() THEN
    RAISE EXCEPTION 'Job acceptance is performed by the platform only';
  END IF;

  -- Deadlock-free lock order: ALWAYS the booking first, then the offer.
  -- The winner updates every sibling offer, so any session holding an offer
  -- row while waiting on the booking would deadlock with it.
  SELECT booking_id INTO v_booking FROM public.job_offers WHERE id = _offer_id;
  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('won', false, 'reason', 'Offer not found');
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = v_booking FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('won', false, 'reason', 'Booking not found');
  END IF;

  SELECT * INTO o FROM public.job_offers WHERE id = _offer_id FOR UPDATE;
  IF NOT FOUND OR o.provider_user_id <> _user_id THEN
    RETURN jsonb_build_object('won', false, 'reason', 'Offer not found');
  END IF;

  -- Idempotency: replaying the winning request returns the same success.
  IF o.status = 'accepted' AND b.provider_id = o.provider_id THEN
    RETURN jsonb_build_object('won', true, 'bookingId', b.id, 'idempotent', true);
  END IF;

  IF o.status <> 'offered' THEN
    RETURN jsonb_build_object('won', false, 'reason', 'This job is no longer available.');
  END IF;
  IF o.expires_at < now() THEN
    UPDATE public.job_offers SET status = 'expired' WHERE id = _offer_id;
    RETURN jsonb_build_object('won', false, 'reason', 'The offer window closed.');
  END IF;
  IF b.status = 'cancelled' THEN
    RETURN jsonb_build_object('won', false, 'reason', 'This booking was cancelled.');
  END IF;
  IF b.status NOT IN ('pending','matching','offered') OR b.provider_id IS NOT NULL THEN
    UPDATE public.job_offers SET status = 'lost', responded_at = now() WHERE id = _offer_id;
    RETURN jsonb_build_object('won', false, 'reason', 'Another provider accepted first.');
  END IF;

  SELECT * INTO p FROM public.providers WHERE id = o.provider_id AND user_id = _user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('won', false, 'reason', 'Provider profile not found.');
  END IF;
  IF p.verification_status <> 'approved' THEN
    UPDATE public.job_offers SET status = 'lost' WHERE id = _offer_id;
    RETURN jsonb_build_object('won', false, 'reason', 'Your account is not approved for this job.');
  END IF;
  IF NOT p.available THEN
    RETURN jsonb_build_object('won', false, 'reason', 'You are offline. Go online to accept jobs.');
  END IF;
  IF p.category IS DISTINCT FROM b.category
     AND NOT EXISTS (
       SELECT 1 FROM public.provider_services ps
       JOIN public.services s ON s.id = ps.service_id
       WHERE ps.provider_id = p.id AND ps.active AND s.slug = b.category
     ) THEN
    RETURN jsonb_build_object('won', false, 'reason', 'You do not offer this service.');
  END IF;

  v_ready := public.provider_readiness(_user_id);
  IF NOT COALESCE((v_ready->>'documents_complete')::boolean, false) THEN
    RETURN jsonb_build_object('won', false, 'reason', 'Your verification documents are incomplete or expired.');
  END IF;

  SELECT count(*) INTO v_open FROM public.bookings
   WHERE provider_id = p.id
     AND status IN ('accepted','provider_arriving','travelling','arrived','in_progress');
  IF v_open >= 3 THEN
    RETURN jsonb_build_object('won', false, 'reason', 'You already have too many active jobs.');
  END IF;

  UPDATE public.bookings
     SET provider_id = p.id,
         status = 'accepted',
         dispatch_state = 'assigned',
         dispatch_updated_at = now()
   WHERE id = b.id
     AND provider_id IS NULL
     AND status IN ('pending','matching','offered')
  RETURNING id INTO v_claimed;

  IF v_claimed IS NULL THEN
    UPDATE public.job_offers SET status = 'lost', responded_at = now() WHERE id = _offer_id;
    RETURN jsonb_build_object('won', false, 'reason', 'Another provider accepted first.');
  END IF;

  UPDATE public.job_offers SET status = 'accepted', responded_at = now() WHERE id = _offer_id;
  UPDATE public.job_offers SET status = 'lost', responded_at = COALESCE(responded_at, now())
   WHERE booking_id = b.id AND id <> _offer_id AND status IN ('offered','quoted','expired');

  INSERT INTO public.booking_status_history (booking_id, old_status, status, changed_by, note, metadata)
  VALUES (b.id, b.status::text, 'accepted', _user_id, 'provider_accepted',
          jsonb_build_object('provider_id', p.id, 'offer_id', _offer_id));

  INSERT INTO public.notifications (user_id, title, body, link, kind)
  VALUES (b.customer_id, 'Provider assigned',
          'A verified ' || b.category || ' provider accepted your job.',
          '/bookings/' || b.id, 'booking_accepted');

  RETURN jsonb_build_object('won', true, 'bookingId', b.id);
END;
$function$;