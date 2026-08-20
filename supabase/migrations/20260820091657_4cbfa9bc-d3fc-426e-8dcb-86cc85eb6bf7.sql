-- 1. History: previous stage + structured metadata -------------------------
ALTER TABLE public.booking_status_history
  ADD COLUMN IF NOT EXISTS old_status text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 2. Canonical lifecycle + transition table --------------------------------
-- Legacy spellings are kept as synonyms so existing rows and UI keep working:
--   pending == requested, travelling == provider_arriving.
CREATE OR REPLACE FUNCTION public.booking_status_canonical(_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _status
    WHEN 'requested' THEN 'pending'
    WHEN 'travelling' THEN 'provider_arriving'
    ELSE _status
  END;
$$;

CREATE OR REPLACE FUNCTION public.booking_transition_allowed(_old text, _new text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  o text := public.booking_status_canonical(_old);
  n text := public.booking_status_canonical(_new);
BEGIN
  IF o = n THEN RETURN true; END IF;
  RETURN CASE o
    WHEN 'pending'           THEN n IN ('matching','offered','accepted','cancelled')
    WHEN 'matching'          THEN n IN ('offered','accepted','pending','cancelled')
    WHEN 'offered'           THEN n IN ('accepted','matching','pending','cancelled')
    WHEN 'accepted'          THEN n IN ('provider_arriving','cancelled')
    WHEN 'provider_arriving' THEN n IN ('arrived','cancelled')
    WHEN 'arrived'           THEN n IN ('in_progress','cancelled')
    WHEN 'in_progress'       THEN n IN ('completed','cancelled')
    WHEN 'completed'         THEN n IN ('disputed')
    WHEN 'disputed'          THEN n IN ('refunded','completed')
    ELSE false            -- cancelled and refunded are terminal
  END;
END;
$$;

-- 3. Booking guard now enforces the state machine for EVERY writer ---------
CREATE OR REPLACE FUNCTION public.booking_mutation_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_customer boolean;
  v_is_provider boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.booking_transition_allowed(OLD.status::text, NEW.status::text) THEN
    RAISE EXCEPTION 'Invalid booking status transition % -> %', OLD.status, NEW.status;
  END IF;

  IF public.is_trusted_writer() THEN
    IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status <> 'completed' THEN
      NEW.completed_at := COALESCE(OLD.completed_at, now());
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.customer_id := auth.uid();
    NEW.status := 'pending';
    NEW.payment_status := 'pending';
    NEW.payment_reference := NULL;
    NEW.customer_confirmed_at := NULL;
    NEW.completed_at := NULL;
    RETURN NEW;
  END IF;

  v_is_customer := OLD.customer_id = auth.uid();
  v_is_provider := EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = OLD.provider_id AND p.user_id = auth.uid()
  );

  NEW.customer_id := OLD.customer_id;
  NEW.provider_id := OLD.provider_id;
  NEW.price := OLD.price;
  NEW.payment_status := OLD.payment_status;
  NEW.payment_reference := OLD.payment_reference;
  NEW.customer_confirmed_at := OLD.customer_confirmed_at;
  NEW.dispatch_state := OLD.dispatch_state;
  NEW.dispatch_wave := OLD.dispatch_wave;
  NEW.dispatch_radius_km := OLD.dispatch_radius_km;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF v_is_customer AND NOT v_is_provider THEN
      IF NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'Customers may only cancel an active booking';
      END IF;
    ELSIF v_is_provider THEN
      IF NOT (
        (OLD.status IN ('pending','matching','offered') AND NEW.status = 'cancelled') OR
        (OLD.status = 'accepted'          AND NEW.status IN ('provider_arriving','travelling','cancelled')) OR
        (OLD.status IN ('provider_arriving','travelling') AND NEW.status IN ('arrived','cancelled')) OR
        (OLD.status = 'arrived'           AND NEW.status IN ('in_progress','cancelled')) OR
        (OLD.status = 'in_progress'       AND NEW.status = 'completed')
      ) THEN
        RAISE EXCEPTION 'Invalid booking status transition % -> %', OLD.status, NEW.status;
      END IF;
    ELSE
      RAISE EXCEPTION 'Not a participant on this booking';
    END IF;
  END IF;

  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    NEW.completed_at := COALESCE(OLD.completed_at, now());
  ELSE
    NEW.completed_at := OLD.completed_at;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Immutable history with old -> new ------------------------------------
CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_status_history (booking_id, old_status, status, changed_by, metadata)
    VALUES (NEW.id, NULL, NEW.status::text, auth.uid(),
            jsonb_build_object('category', NEW.category, 'dispatch_state', NEW.dispatch_state));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.booking_status_history (booking_id, old_status, status, changed_by, metadata)
    VALUES (NEW.id, OLD.status::text, NEW.status::text, auth.uid(),
            jsonb_build_object('provider_id', NEW.provider_id, 'dispatch_state', NEW.dispatch_state));
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Atomic, fully validated job acceptance --------------------------------
CREATE OR REPLACE FUNCTION public.accept_job_offer(_offer_id uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  b RECORD;
  p RECORD;
  v_ready jsonb;
  v_open int;
  v_claimed uuid;
BEGIN
  IF NOT public.is_trusted_writer() THEN
    RAISE EXCEPTION 'Job acceptance is performed by the platform only';
  END IF;

  SELECT * INTO o FROM public.job_offers WHERE id = _offer_id FOR UPDATE;
  IF NOT FOUND OR o.provider_user_id <> _user_id THEN
    RETURN jsonb_build_object('won', false, 'reason', 'Offer not found');
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = o.booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('won', false, 'reason', 'Booking not found');
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
$$;

REVOKE ALL ON FUNCTION public.accept_job_offer(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_job_offer(uuid, uuid) TO service_role;

-- 6. Validated, audited cancellation ---------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_booking_as(_booking_id uuid, _actor uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b RECORD;
  v_role text;
BEGIN
  IF NOT public.is_trusted_writer() THEN
    RAISE EXCEPTION 'Cancellation is performed by the platform only';
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;

  IF b.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'previous', b.status::text);
  END IF;
  IF NOT public.booking_transition_allowed(b.status::text, 'cancelled') THEN
    RAISE EXCEPTION 'A % booking can no longer be cancelled', b.status;
  END IF;

  IF public.has_role(_actor, 'admin') THEN
    v_role := 'admin';
  ELSIF b.customer_id = _actor THEN
    v_role := 'customer';
  ELSIF EXISTS (SELECT 1 FROM public.providers p WHERE p.id = b.provider_id AND p.user_id = _actor) THEN
    v_role := 'provider';
  ELSE
    RAISE EXCEPTION 'Not a participant on this booking';
  END IF;

  UPDATE public.bookings
     SET status = 'cancelled', dispatch_state = 'cancelled', dispatch_updated_at = now()
   WHERE id = _booking_id;

  UPDATE public.job_offers SET status = 'cancelled', responded_at = COALESCE(responded_at, now())
   WHERE booking_id = _booking_id AND status IN ('offered','quoted');

  INSERT INTO public.booking_status_history (booking_id, old_status, status, changed_by, note, metadata)
  VALUES (_booking_id, b.status::text, 'cancelled', _actor, _reason,
          jsonb_build_object('cancelled_by_role', v_role, 'reason', _reason,
                             'previous_status', b.status::text, 'provider_id', b.provider_id));

  IF v_role = 'admin' THEN
    PERFORM public.log_admin_action('booking_cancelled', 'booking', _booking_id,
      jsonb_build_object('reason', _reason, 'previous_status', b.status::text));
  END IF;

  INSERT INTO public.notifications (user_id, title, body, link, kind)
  SELECT u, 'Booking cancelled',
         'The ' || b.category || ' booking was cancelled.',
         '/bookings/' || b.id, 'booking_cancelled'
  FROM (
    SELECT b.customer_id AS u
    UNION
    SELECT p.user_id FROM public.providers p WHERE p.id = b.provider_id
  ) t
  WHERE u IS DISTINCT FROM _actor;

  RETURN jsonb_build_object('ok', true, 'previous', b.status::text, 'role', v_role);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_booking_as(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_as(uuid, uuid, text) TO service_role;

-- 7. Delivery settlement through the existing ledger -----------------------
CREATE OR REPLACE FUNCTION public.settle_delivery(_delivery_id uuid)
RETURNS TABLE(gross numeric, commission numeric, provider_earnings numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d RECORD;
  v_gross numeric;
  v_comm numeric;
BEGIN
  IF NOT public.is_trusted_writer() THEN
    RAISE EXCEPTION 'Settlement is performed by the platform only';
  END IF;

  SELECT * INTO d FROM public.deliveries WHERE id = _delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  IF d.status <> 'delivered' THEN RAISE EXCEPTION 'Delivery is not completed'; END IF;
  IF d.driver_id IS NULL THEN RAISE EXCEPTION 'Delivery has no driver'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payments WHERE delivery_id = _delivery_id AND status = 'paid') THEN
    RAISE EXCEPTION 'Payment for this delivery is not confirmed';
  END IF;

  v_gross := COALESCE(d.price, 0);
  v_comm  := public.calc_commission('delivery', v_gross);

  -- Stable references make a repeated settlement a no-op inside the ledger.
  PERFORM public.post_wallet_transaction(
    d.driver_id, 'job_earning', v_gross, 'delivery:' || _delivery_id || ':earning',
    NULL, _delivery_id, NULL, 'Delivery earnings');
  PERFORM public.post_wallet_transaction(
    d.driver_id, 'commission', -v_comm, 'delivery:' || _delivery_id || ':commission',
    NULL, _delivery_id, NULL, 'Zwits commission on delivery');

  INSERT INTO public.notifications (user_id, title, body, link, kind)
  VALUES (d.driver_id, 'Earnings credited', 'Your wallet was credited for a completed delivery.',
          '/driver', 'earnings_credited');

  RETURN QUERY SELECT v_gross, v_comm, v_gross - v_comm;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_delivery(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_delivery(uuid) TO service_role;

-- 8. Deliveries follow the same lifecycle rules ----------------------------
CREATE OR REPLACE FUNCTION public.delivery_transition_allowed(_old text, _new text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF _old = _new THEN RETURN true; END IF;
  RETURN CASE _old
    WHEN 'pending'    THEN _new IN ('matching','offered','accepted','cancelled')
    WHEN 'matching'   THEN _new IN ('offered','accepted','pending','cancelled')
    WHEN 'offered'    THEN _new IN ('accepted','matching','pending','cancelled')
    WHEN 'accepted'   THEN _new IN ('arriving','picked_up','cancelled')
    WHEN 'arriving'   THEN _new IN ('picked_up','cancelled')
    WHEN 'picked_up'  THEN _new IN ('delivered','cancelled')
    WHEN 'delivered'  THEN _new IN ('disputed')
    WHEN 'disputed'   THEN _new IN ('refunded','delivered')
    ELSE false
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.delivery_mutation_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.delivery_transition_allowed(OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'Invalid delivery status transition % -> %', OLD.status, NEW.status;
  END IF;

  IF public.is_trusted_writer() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.customer_id := auth.uid();
    NEW.driver_id := NULL;
    NEW.status := 'pending';
    NEW.payment_status := 'pending';
    NEW.picked_up_at := NULL;
    NEW.delivered_at := NULL;
    NEW.proof_photo_url := NULL;
    RETURN NEW;
  END IF;

  NEW.customer_id := OLD.customer_id;
  NEW.driver_id := OLD.driver_id;
  NEW.price := OLD.price;
  NEW.distance_km := OLD.distance_km;
  NEW.payment_status := OLD.payment_status;
  NEW.dispatch_state := OLD.dispatch_state;
  NEW.dispatch_wave := OLD.dispatch_wave;
  NEW.proof_photo_url := OLD.proof_photo_url;
  NEW.picked_up_at := OLD.picked_up_at;
  NEW.delivered_at := OLD.delivered_at;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'Delivery status changes are handled by the platform';
    END IF;
    IF auth.uid() NOT IN (COALESCE(OLD.customer_id, '00000000-0000-0000-0000-000000000000'::uuid),
                          COALESCE(OLD.driver_id,   '00000000-0000-0000-0000-000000000000'::uuid)) THEN
      RAISE EXCEPTION 'Not a participant on this delivery';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 9. Database-level guarantees and hot-path indexes ------------------------
CREATE UNIQUE INDEX IF NOT EXISTS job_offers_one_accepted_per_booking
  ON public.job_offers (booking_id) WHERE status = 'accepted';
CREATE UNIQUE INDEX IF NOT EXISTS delivery_offers_one_accepted
  ON public.delivery_offers (delivery_id) WHERE status = 'accepted';
CREATE UNIQUE INDEX IF NOT EXISTS delivery_offers_delivery_driver_uniq
  ON public.delivery_offers (delivery_id, driver_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_reference_uniq
  ON public.wallet_transactions (reference);
CREATE INDEX IF NOT EXISTS providers_dispatch_idx
  ON public.providers (category, verification_status, available);
CREATE INDEX IF NOT EXISTS bookings_provider_status_idx
  ON public.bookings (provider_id, status);
CREATE INDEX IF NOT EXISTS provider_withdrawals_status_idx
  ON public.provider_withdrawals (status, created_at DESC);
CREATE INDEX IF NOT EXISTS delivery_offers_expiry_idx
  ON public.delivery_offers (expires_at) WHERE status = 'offered';
CREATE INDEX IF NOT EXISTS provider_locations_booking_provider_idx
  ON public.provider_locations (booking_id, provider_user_id);