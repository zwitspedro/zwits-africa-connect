-- Cash jobs: the provider already holds the customer's cash, so the wallet must
-- not become withdrawable for it. Ledger: +gross earning, -gross cash held, -commission.
CREATE OR REPLACE FUNCTION public.settle_booking(_booking_id uuid)
 RETURNS TABLE(gross numeric, commission numeric, provider_earnings numeric)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  b RECORD;
  v_provider_user UUID;
  v_gross NUMERIC;
  v_comm  NUMERIC;
  v_net   NUMERIC;
  v_cash  BOOLEAN;
BEGIN
  IF NOT public.is_trusted_writer() THEN
    RAISE EXCEPTION 'Settlement is performed by the platform only';
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF b.status <> 'completed' THEN RAISE EXCEPTION 'Booking is not completed'; END IF;
  IF b.provider_id IS NULL THEN RAISE EXCEPTION 'Booking has no provider'; END IF;

  SELECT (p.payment_method = 'cash') INTO v_cash
  FROM public.payments p WHERE p.booking_id = _booking_id AND p.status = 'paid' LIMIT 1;
  IF v_cash IS NULL THEN
    RAISE EXCEPTION 'Payment for this booking is not confirmed';
  END IF;

  SELECT user_id INTO v_provider_user FROM public.providers WHERE id = b.provider_id;

  v_gross := COALESCE(b.price, b.budget, 0);
  v_comm  := public.calc_commission(b.category, v_gross);
  v_net   := v_gross - v_comm;

  PERFORM public.post_wallet_transaction(
    v_provider_user, 'job_earning', v_gross, 'booking:' || _booking_id || ':earning',
    _booking_id, NULL, NULL, 'Job value for ' || b.category);

  IF v_cash THEN
    PERFORM public.post_wallet_transaction(
      v_provider_user, 'adjustment', -v_gross, 'booking:' || _booking_id || ':cash_held',
      _booking_id, NULL, NULL, 'Cash collected directly from the customer', true);
  END IF;

  PERFORM public.post_wallet_transaction(
    v_provider_user, 'commission', -v_comm, 'booking:' || _booking_id || ':commission',
    _booking_id, NULL, NULL, 'Zwits commission on ' || b.category, v_cash);

  INSERT INTO public.notifications (user_id, title, body, link, kind)
  VALUES (v_provider_user,
          CASE WHEN v_cash THEN 'Cash job settled' ELSE 'Earnings credited' END,
          CASE WHEN v_cash
               THEN 'You kept the cash for your ' || b.category || ' job; the Zwits commission was recorded on your wallet.'
               ELSE 'Your wallet was credited for a completed ' || b.category || ' job.' END,
          '/provider/dashboard', 'earnings_credited');

  RETURN QUERY SELECT v_gross, v_comm, v_net;
END;
$function$;