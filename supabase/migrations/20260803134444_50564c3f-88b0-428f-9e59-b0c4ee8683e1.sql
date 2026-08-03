-- ============================================================
-- Helper: trusted-writer detection + booking participation
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_trusted_writer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(auth.role(), '') IN ('service_role', 'supabase_admin')
      OR coalesce(current_setting('zwits.trusted', true), '') = 'on'
      OR public.has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_booking_participant(_booking_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    LEFT JOIN public.providers p ON p.id = b.provider_id
    WHERE b.id = _booking_id
      AND (b.customer_id = _user_id OR p.user_id = _user_id)
  );
$$;

REVOKE ALL ON FUNCTION public.is_trusted_writer() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_booking_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_booking_participant(uuid, uuid) TO authenticated;

-- ============================================================
-- 1. PROVIDER SELF-APPROVAL FIX
-- ============================================================
DROP TRIGGER IF EXISTS trg_a_auto_approve_provider ON public.providers;
DROP FUNCTION IF EXISTS public.auto_approve_provider();

CREATE OR REPLACE FUNCTION public.provider_verification_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_writer() THEN
    -- Admin / trusted server workflow: keep the derived flags consistent.
    IF TG_OP = 'UPDATE' AND NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      NEW.reviewed_at := now();
      NEW.reviewed_by := COALESCE(auth.uid(), NEW.reviewed_by);
    END IF;
    IF NEW.verification_status = 'approved' THEN
      NEW.verified := true;
      NEW.revoke_reason := NULL;
    ELSIF NEW.verification_status = 'revoked' THEN
      NEW.verified := false;
      NEW.available := false;
    ELSE
      NEW.verified := false;
    END IF;
    RETURN NEW;
  END IF;

  -- Untrusted (the provider themselves): admin-controlled fields are immutable.
  IF TG_OP = 'INSERT' THEN
    NEW.verification_status := 'unverified';
    NEW.verified := false;
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
    NEW.revoke_reason := NULL;
    NEW.rating_avg := 0;
    NEW.ratings_count := 0;
    NEW.jobs_completed := 0;
  ELSE
    NEW.user_id := OLD.user_id;
    NEW.verification_status := OLD.verification_status;
    NEW.verified := OLD.verified;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.revoke_reason := OLD.revoke_reason;
    NEW.rating_avg := OLD.rating_avg;
    NEW.ratings_count := OLD.ratings_count;
    NEW.jobs_completed := OLD.jobs_completed;
  END IF;

  -- Complete document set submits for review — never auto-approves.
  IF NEW.id_document_url IS NOT NULL
     AND NEW.selfie_url IS NOT NULL
     AND NEW.business_doc_url IS NOT NULL
     AND NEW.verification_status = 'unverified' THEN
    NEW.verification_status := 'pending';
    NEW.submitted_at := COALESCE(NEW.submitted_at, now());
  END IF;

  IF NEW.verification_status <> 'approved' THEN
    NEW.verified := false;
  END IF;
  IF NEW.verification_status = 'revoked' THEN
    NEW.available := false;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_a_provider_verification_guard
  BEFORE INSERT OR UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.provider_verification_guard();

-- Rating / job-count triggers are legitimate writers.
CREATE OR REPLACE FUNCTION public.recompute_provider_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg NUMERIC(3,2);
  v_count INTEGER;
BEGIN
  SELECT COALESCE(AVG(rating), 0)::NUMERIC(3,2), COUNT(*)
    INTO v_avg, v_count
    FROM public.ratings WHERE provider_id = NEW.provider_id;

  PERFORM set_config('zwits.trusted', 'on', true);
  UPDATE public.providers
    SET rating_avg = v_avg, ratings_count = v_count
    WHERE id = NEW.provider_id;
  PERFORM set_config('zwits.trusted', 'off', true);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.bump_jobs_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' AND NEW.provider_id IS NOT NULL THEN
    PERFORM set_config('zwits.trusted', 'on', true);
    UPDATE public.providers
      SET jobs_completed = jobs_completed + 1
      WHERE id = NEW.provider_id;
    PERFORM set_config('zwits.trusted', 'off', true);
  END IF;
  RETURN NEW;
END;
$$;

-- Ownership can never be reassigned on update.
DROP POLICY IF EXISTS "Users update own provider profile" ON public.providers;
CREATE POLICY "Users update own provider profile"
  ON public.providers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. DRIVER PROFILE FIELD PROTECTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.driver_profile_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_writer() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.verification_status := 'unverified';
    NEW.reviewed_at := NULL;
    NEW.deliveries_completed := 0;
    NEW.rating_avg := 0;
    NEW.ratings_count := 0;
  ELSE
    NEW.user_id := OLD.user_id;
    NEW.verification_status := OLD.verification_status;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.deliveries_completed := OLD.deliveries_completed;
    NEW.rating_avg := OLD.rating_avg;
    NEW.ratings_count := OLD.ratings_count;
  END IF;

  IF NEW.licence_url IS NOT NULL
     AND NEW.id_document_url IS NOT NULL
     AND NEW.vehicle_doc_url IS NOT NULL
     AND NEW.verification_status = 'unverified' THEN
    NEW.verification_status := 'pending';
    NEW.submitted_at := COALESCE(NEW.submitted_at, now());
  END IF;

  IF NEW.verification_status = 'revoked' THEN
    NEW.available := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_driver_profile_guard ON public.driver_profiles;
CREATE TRIGGER trg_driver_profile_guard
  BEFORE INSERT OR UPDATE ON public.driver_profiles
  FOR EACH ROW EXECUTE FUNCTION public.driver_profile_guard();

-- ============================================================
-- 3. BOOKING LIFECYCLE / PAYMENT PROTECTION
-- ============================================================
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
  IF public.is_trusted_writer() THEN
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

  -- Ownership, money and dispatch state are server-controlled.
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
      IF NEW.status <> 'cancelled' OR OLD.status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Customers may only cancel an active booking';
      END IF;
    ELSIF v_is_provider THEN
      IF NOT (
        (OLD.status = 'pending'     AND NEW.status IN ('accepted', 'cancelled')) OR
        (OLD.status = 'accepted'    AND NEW.status IN ('travelling', 'cancelled')) OR
        (OLD.status = 'travelling'  AND NEW.status IN ('arrived', 'cancelled')) OR
        (OLD.status = 'arrived'     AND NEW.status IN ('in_progress', 'cancelled')) OR
        (OLD.status = 'in_progress' AND NEW.status = 'completed')
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

DROP TRIGGER IF EXISTS trg_aa_booking_mutation_guard ON public.bookings;
CREATE TRIGGER trg_aa_booking_mutation_guard
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.booking_mutation_guard();

-- ============================================================
-- 4. DELIVERY LIFECYCLE / PAYMENT PROTECTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.delivery_mutation_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    IF NEW.status <> 'cancelled' OR OLD.status IN ('delivered', 'cancelled') THEN
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

DROP TRIGGER IF EXISTS trg_delivery_mutation_guard ON public.deliveries;
CREATE TRIGGER trg_delivery_mutation_guard
  BEFORE INSERT OR UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.delivery_mutation_guard();

-- ============================================================
-- 5. MESSAGE PARTICIPANT SECURITY
-- ============================================================
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Participants send messages on their bookings"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND receiver_id <> sender_id
    AND public.is_booking_participant(booking_id, auth.uid())
    AND public.is_booking_participant(booking_id, receiver_id)
  );

DROP POLICY IF EXISTS "Users can view messages they sent or received" ON public.messages;
CREATE POLICY "Participants view booking messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    ((sender_id = auth.uid() OR receiver_id = auth.uid())
      AND public.is_booking_participant(booking_id, auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );