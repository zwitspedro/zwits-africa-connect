
CREATE OR REPLACE FUNCTION public.settle_booking(_booking_id UUID)
RETURNS TABLE(gross NUMERIC, commission NUMERIC, provider_earnings NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b RECORD;
  v_provider_user UUID;
  v_gross NUMERIC;
  v_comm  NUMERIC;
  v_net   NUMERIC;
BEGIN
  IF NOT public.is_trusted_writer() THEN
    RAISE EXCEPTION 'Settlement is performed by the platform only';
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF b.status <> 'completed' THEN RAISE EXCEPTION 'Booking is not completed'; END IF;
  IF b.provider_id IS NULL THEN RAISE EXCEPTION 'Booking has no provider'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payments WHERE booking_id = _booking_id AND status = 'paid') THEN
    RAISE EXCEPTION 'Payment for this booking is not confirmed';
  END IF;

  SELECT user_id INTO v_provider_user FROM public.providers WHERE id = b.provider_id;

  v_gross := COALESCE(b.price, b.budget, 0);
  v_comm  := public.calc_commission(b.category, v_gross);
  v_net   := v_gross - v_comm;

  -- Gross in, commission out: two immutable entries, never a single net figure.
  PERFORM public.post_wallet_transaction(
    v_provider_user, 'job_earning', v_gross, 'booking:' || _booking_id || ':earning',
    _booking_id, NULL, NULL, 'Job value for ' || b.category);

  PERFORM public.post_wallet_transaction(
    v_provider_user, 'commission', -v_comm, 'booking:' || _booking_id || ':commission',
    _booking_id, NULL, NULL, 'Zwits commission on ' || b.category);

  INSERT INTO public.notifications (user_id, title, body, link, kind)
  VALUES (v_provider_user, 'Earnings credited',
          'Your wallet was credited for a completed ' || b.category || ' job.',
          '/provider/dashboard', 'earnings_credited');

  RETURN QUERY SELECT v_gross, v_comm, v_net;
END;
$$;
REVOKE ALL ON FUNCTION public.settle_booking(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_booking(uuid) TO service_role;
