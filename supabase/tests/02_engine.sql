-- Booking engine integration tests. Everything runs inside one transaction and
-- is rolled back, so the suite is safe to run against a live database.
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  cust uuid := gen_random_uuid();
  ua   uuid := gen_random_uuid();
  ub   uuid := gen_random_uuid();
  pa   uuid;
  pb   uuid;
  bk   uuid;
  bk2  uuid;
  oa   uuid;
  ob   uuid;
  dlv  uuid;
  res  jsonb;
  bal  numeric;
  bal2 numeric;
  comm numeric;
  n    int;
  failed boolean;
BEGIN
  PERFORM set_config('zwits.trusted', 'on', true);

  -- Fixtures -------------------------------------------------------------
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES
    ('00000000-0000-0000-0000-000000000000', cust, 'authenticated', 'authenticated',
     'test-cust-' || cust || '@example.test', 'x', now(), now(), now(), '{}'::jsonb),
    ('00000000-0000-0000-0000-000000000000', ua, 'authenticated', 'authenticated',
     'test-pa-' || ua || '@example.test', 'x', now(), now(), now(), '{}'::jsonb),
    ('00000000-0000-0000-0000-000000000000', ub, 'authenticated', 'authenticated',
     'test-pb-' || ub || '@example.test', 'x', now(), now(), now(), '{}'::jsonb);

  PERFORM set_config('zwits.trusted', 'on', true);
  INSERT INTO public.providers (user_id, business_name, category, city, hourly_rate,
                                verification_status, available, id_document_url, selfie_url, business_doc_url)
  VALUES (ua, 'A Plumbing', 'plumbing', 'Harare', 20, 'approved', true, 'a/id.jpg', 'a/selfie.jpg', 'a/biz.jpg')
  RETURNING id INTO pa;

  PERFORM set_config('zwits.trusted', 'on', true);
  INSERT INTO public.providers (user_id, business_name, category, city, hourly_rate,
                                verification_status, available, id_document_url, selfie_url, business_doc_url)
  VALUES (ub, 'B Plumbing', 'plumbing', 'Harare', 22, 'approved', true, 'b/id.jpg', 'b/selfie.jpg', 'b/biz.jpg')
  RETURNING id INTO pb;

  PERFORM set_config('zwits.trusted', 'on', true);
  INSERT INTO public.bookings (customer_id, category, address, status, price, payment_method, payment_status)
  VALUES (cust, 'plumbing', '1 Test Rd, Harare', 'pending', 100, 'cash', 'pending')
  RETURNING id INTO bk;

  INSERT INTO public.job_offers (booking_id, provider_id, provider_user_id, wave, status, expires_at)
  VALUES (bk, pa, ua, 1, 'offered', now() + interval '5 minutes') RETURNING id INTO oa;
  INSERT INTO public.job_offers (booking_id, provider_id, provider_user_id, wave, status, expires_at)
  VALUES (bk, pb, ub, 1, 'offered', now() + interval '5 minutes') RETURNING id INTO ob;

  -- T1: provider A accepts ------------------------------------------------
  res := public.accept_job_offer(oa, ua);
  IF NOT (res->>'won')::boolean THEN RAISE EXCEPTION 'FAIL T1 accept: %', res; END IF;
  IF (SELECT provider_id FROM public.bookings WHERE id = bk) <> pa THEN
    RAISE EXCEPTION 'FAIL T1 assignment';
  END IF;
  IF (SELECT status FROM public.bookings WHERE id = bk) <> 'accepted' THEN
    RAISE EXCEPTION 'FAIL T1 status';
  END IF;

  -- T2: duplicate accept is idempotent ------------------------------------
  res := public.accept_job_offer(oa, ua);
  IF NOT (res->>'won')::boolean OR NOT COALESCE((res->>'idempotent')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL T2 idempotent accept: %', res;
  END IF;

  -- T3: the losing provider is rejected, exactly one accepted offer --------
  res := public.accept_job_offer(ob, ub);
  IF (res->>'won')::boolean THEN RAISE EXCEPTION 'FAIL T3 second provider won'; END IF;
  SELECT count(*) INTO n FROM public.job_offers WHERE booking_id = bk AND status = 'accepted';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL T3 accepted offers = %', n; END IF;
  SELECT count(*) INTO n FROM public.bookings WHERE id = bk AND provider_id = pa;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL T3 assignment count'; END IF;

  -- T4: wrong user cannot accept somebody else's offer ---------------------
  res := public.accept_job_offer(ob, ua);
  IF (res->>'won')::boolean THEN RAISE EXCEPTION 'FAIL T4 cross-provider accept'; END IF;

  -- T5: offline / expired / unverified rejections --------------------------
  PERFORM set_config('zwits.trusted', 'on', true);
  INSERT INTO public.bookings (customer_id, category, address, status, price, payment_method, payment_status)
  VALUES (cust, 'plumbing', '2 Test Rd, Harare', 'pending', 80, 'cash', 'pending')
  RETURNING id INTO bk2;
  INSERT INTO public.job_offers (booking_id, provider_id, provider_user_id, wave, status, expires_at)
  VALUES (bk2, pb, ub, 1, 'offered', now() + interval '5 minutes') RETURNING id INTO ob;

  PERFORM set_config('zwits.trusted', 'on', true);
  UPDATE public.providers SET available = false WHERE id = pb;
  res := public.accept_job_offer(ob, ub);
  IF (res->>'won')::boolean THEN RAISE EXCEPTION 'FAIL T5 offline provider accepted'; END IF;

  PERFORM set_config('zwits.trusted', 'on', true);
  UPDATE public.providers SET available = true, verification_status = 'revoked' WHERE id = pb;
  res := public.accept_job_offer(ob, ub);
  IF (res->>'won')::boolean THEN RAISE EXCEPTION 'FAIL T5 unverified provider accepted'; END IF;

  PERFORM set_config('zwits.trusted', 'on', true);
  UPDATE public.providers SET verification_status = 'approved' WHERE id = pb;
  UPDATE public.job_offers SET status = 'offered', expires_at = now() - interval '1 minute' WHERE id = ob;
  res := public.accept_job_offer(ob, ub);
  IF (res->>'won')::boolean THEN RAISE EXCEPTION 'FAIL T5 expired offer accepted'; END IF;
  IF (SELECT status FROM public.job_offers WHERE id = ob) <> 'expired' THEN
    RAISE EXCEPTION 'FAIL T5 offer not marked expired';
  END IF;
  IF (SELECT status FROM public.bookings WHERE id = bk2) <> 'pending' THEN
    RAISE EXCEPTION 'FAIL T5 booking stuck after expiry';
  END IF;

  -- T6: illegal jump is rejected even for the platform ---------------------
  failed := false;
  BEGIN
    PERFORM set_config('zwits.trusted', 'on', true);
    UPDATE public.bookings SET status = 'completed' WHERE id = bk;
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL T6 accepted -> completed was allowed'; END IF;

  -- T7: legal lifecycle walk + history -------------------------------------
  PERFORM set_config('zwits.trusted', 'on', true);
  UPDATE public.bookings SET status = 'provider_arriving' WHERE id = bk;
  UPDATE public.bookings SET status = 'arrived' WHERE id = bk;
  UPDATE public.bookings SET status = 'in_progress' WHERE id = bk;
  UPDATE public.bookings SET status = 'completed' WHERE id = bk;
  SELECT count(*) INTO n FROM public.booking_status_history
   WHERE booking_id = bk AND old_status IS NOT NULL AND status IS NOT NULL;
  IF n < 4 THEN RAISE EXCEPTION 'FAIL T7 history rows = %', n; END IF;

  -- T8: settlement requires a paid payment ---------------------------------
  failed := false;
  BEGIN
    PERFORM public.settle_booking(bk);
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL T8 settled without payment'; END IF;

  -- T9: settlement credits the wallet once ----------------------------------
  PERFORM set_config('zwits.trusted', 'on', true);
  INSERT INTO public.payments (booking_id, customer_id, amount, currency, payment_method, status, paid_at)
  VALUES (bk, cust, 100, 'USD', 'cash', 'paid', now());

  PERFORM public.settle_booking(bk);
  SELECT available_balance INTO bal FROM public.provider_wallets WHERE provider_user_id = ua;
  comm := public.calc_commission('plumbing', 100);
  IF bal <> 100 - comm THEN RAISE EXCEPTION 'FAIL T9 balance % expected %', bal, 100 - comm; END IF;

  PERFORM public.settle_booking(bk);
  SELECT available_balance INTO bal2 FROM public.provider_wallets WHERE provider_user_id = ua;
  IF bal2 <> bal THEN RAISE EXCEPTION 'FAIL T9 double credit: % -> %', bal, bal2; END IF;
  SELECT count(*) INTO n FROM public.wallet_transactions WHERE booking_id = bk;
  IF n <> 2 THEN RAISE EXCEPTION 'FAIL T9 ledger entries = %', n; END IF;

  -- T10: cancellation rules --------------------------------------------------
  failed := false;
  BEGIN
    PERFORM public.cancel_booking_as(bk, cust, 'changed my mind');
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL T10 completed booking was cancelled'; END IF;

  res := public.cancel_booking_as(bk2, cust, 'no longer needed');
  IF NOT (res->>'ok')::boolean OR res->>'role' <> 'customer' THEN
    RAISE EXCEPTION 'FAIL T10 customer cancel: %', res;
  END IF;
  res := public.cancel_booking_as(bk2, cust, 'again');
  IF NOT COALESCE((res->>'idempotent')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL T10 repeat cancel not idempotent: %', res;
  END IF;
  SELECT count(*) INTO n FROM public.booking_status_history
   WHERE booking_id = bk2 AND status = 'cancelled' AND metadata->>'cancelled_by_role' = 'customer';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL T10 cancel history = %', n; END IF;

  failed := false;
  BEGIN
    PERFORM public.cancel_booking_as(bk2, ub, 'not my booking');
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  IF NOT failed AND (SELECT status FROM public.bookings WHERE id = bk2) <> 'cancelled' THEN
    RAISE EXCEPTION 'FAIL T10 non-participant cancel';
  END IF;

  -- T11: delivery settlement through the same ledger --------------------------
  PERFORM set_config('zwits.trusted', 'on', true);
  INSERT INTO public.driver_profiles (user_id, city, available, verification_status)
  VALUES (ub, 'Harare', true, 'approved');

  INSERT INTO public.deliveries (customer_id, driver_id, service_tier, parcel_size,
                                 pickup_address, dropoff_address, price, status, payment_status)
  VALUES (cust, ub, 'express_bike', 'small', 'Pickup', 'Dropoff', 20, 'accepted', 'pending')
  RETURNING id INTO dlv;

  failed := false;
  BEGIN
    PERFORM set_config('zwits.trusted', 'on', true);
    UPDATE public.deliveries SET status = 'delivered' WHERE id = dlv;
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL T11 accepted -> delivered was allowed'; END IF;

  PERFORM set_config('zwits.trusted', 'on', true);
  UPDATE public.deliveries SET status = 'picked_up' WHERE id = dlv;
  UPDATE public.deliveries SET status = 'delivered' WHERE id = dlv;

  failed := false;
  BEGIN
    PERFORM public.settle_delivery(dlv);
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL T11 delivery settled without payment'; END IF;

  PERFORM set_config('zwits.trusted', 'on', true);
  INSERT INTO public.payments (delivery_id, customer_id, amount, currency, payment_method, status, paid_at)
  VALUES (dlv, cust, 20, 'USD', 'cash', 'paid', now());

  PERFORM public.settle_delivery(dlv);
  SELECT available_balance INTO bal FROM public.provider_wallets WHERE provider_user_id = ub;
  comm := public.calc_commission('delivery', 20);
  IF bal <> 20 - comm THEN RAISE EXCEPTION 'FAIL T11 driver balance % expected %', bal, 20 - comm; END IF;

  PERFORM public.settle_delivery(dlv);
  SELECT available_balance INTO bal2 FROM public.provider_wallets WHERE provider_user_id = ub;
  IF bal2 <> bal THEN RAISE EXCEPTION 'FAIL T11 delivery double credit'; END IF;

  -- T12: wallet ledger is immutable -------------------------------------------
  failed := false;
  BEGIN
    UPDATE public.wallet_transactions SET amount = 999 WHERE booking_id = bk;
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL T12 ledger was mutable'; END IF;

  RAISE NOTICE 'PASS 02_engine: 12 scenarios';
END $$;

ROLLBACK;
