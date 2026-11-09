-- Run on a privileged connection; all account, booking and balance changes roll back.
BEGIN;
DO $$
DECLARE u uuid; p uuid; c uuid; outsider uuid; b uuid; m text; start_balance numeric; r jsonb;
BEGIN
 SELECT user_id,id INTO u,p FROM public.providers WHERE verification_status='approved' ORDER BY created_at LIMIT 1;
 SELECT user_id INTO c FROM public.profiles WHERE user_id<>u ORDER BY created_at LIMIT 1;
 SELECT user_id INTO outsider FROM public.profiles WHERE user_id NOT IN (u,c) ORDER BY created_at LIMIT 1;
 IF u IS NULL OR c IS NULL OR outsider IS NULL THEN RAISE EXCEPTION 'Three accounts including approved provider required'; END IF;
 PERFORM set_config('zwits.trusted','on',true);
 INSERT INTO public.provider_direct_accounts(provider_user_id,account_holder,ecocash_number,bank_name,bank_account) VALUES(u,'Isolated fixture','+263771234567','Fixture bank','12345678') ON CONFLICT(provider_user_id) DO UPDATE SET account_holder=excluded.account_holder,ecocash_number=excluded.ecocash_number,bank_name=excluded.bank_name,bank_account=excluded.bank_account;
 FOREACH m IN ARRAY ARRAY['direct_ecocash','direct_bank'] LOOP
  INSERT INTO public.bookings(customer_id,provider_id,category,address,status,price,payment_method) VALUES(c,p,'plumbing','ROLLED BACK direct payment test','accepted',100,'cash') RETURNING id INTO b;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',c,'role','authenticated')::text,true);
  PERFORM public.choose_booking_direct_payment(b,m);
  IF (SELECT payment_status FROM public.bookings WHERE id=b)<>'pending' THEN RAISE EXCEPTION 'Selection incorrectly marks paid'; END IF;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated')::text,true);
  BEGIN PERFORM public.booking_direct_accounts(b); RAISE EXCEPTION 'FAIL outsider read'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Forbidden' THEN RAISE; END IF; END;
  UPDATE public.bookings SET status='provider_arriving' WHERE id=b;
  UPDATE public.bookings SET status='arrived' WHERE id=b;
  UPDATE public.bookings SET status='in_progress' WHERE id=b;
  UPDATE public.bookings SET status='completed' WHERE id=b;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',c,'role','authenticated')::text,true);
  BEGIN PERFORM public.confirm_direct_booking(b); RAISE EXCEPTION 'FAIL customer receipt'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Only the assigned provider can confirm receipt' THEN RAISE; END IF; END;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
  SELECT coalesce(available_balance,0) INTO start_balance FROM public.provider_wallets WHERE provider_user_id=u;
  r:=public.confirm_direct_booking(b);
  IF (r->>'commission')::numeric<>10 OR (r->>'providerEarnings')::numeric<>90 THEN RAISE EXCEPTION 'Income mismatch'; END IF;
  IF (SELECT available_balance FROM public.provider_wallets WHERE provider_user_id=u)<>coalesce(start_balance,0)-10 THEN RAISE EXCEPTION 'Direct payment became withdrawable'; END IF;
  PERFORM public.confirm_direct_booking(b);
  IF (SELECT count(*) FROM public.wallet_transactions WHERE booking_id=b)<>3 THEN RAISE EXCEPTION 'Duplicate ledger'; END IF;
  IF (SELECT payment_status FROM public.bookings WHERE id=b)<>'paid' THEN RAISE EXCEPTION 'Receipt did not read back'; END IF;
  IF (SELECT confirmed_by FROM public.booking_direct_receipts WHERE booking_id=b)<>u THEN RAISE EXCEPTION 'Receipt actor missing'; END IF;
 END LOOP;
 RAISE NOTICE 'PASS: both direct methods, pending until provider confirms, outsider denied, customer denied, $10 debt, $90 income, idempotency';
END $$;
ROLLBACK;