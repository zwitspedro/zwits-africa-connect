CREATE TABLE public.provider_direct_accounts (
 provider_user_id uuid PRIMARY KEY,
 account_holder text NOT NULL CHECK (length(trim(account_holder)) BETWEEN 2 AND 120),
 ecocash_number text CHECK (ecocash_number IS NULL OR ecocash_number ~ '^\+263(77|78)[0-9]{7}$'),
 bank_name text CHECK (bank_name IS NULL OR length(trim(bank_name)) BETWEEN 2 AND 120),
 bank_account text CHECK (bank_account IS NULL OR length(trim(bank_account)) BETWEEN 4 AND 80),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((bank_name IS NULL) = (bank_account IS NULL))
);
GRANT SELECT, INSERT, UPDATE ON public.provider_direct_accounts TO authenticated;
GRANT ALL ON public.provider_direct_accounts TO service_role;
ALTER TABLE public.provider_direct_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY direct_account_owner ON public.provider_direct_accounts FOR ALL TO authenticated USING(provider_user_id=auth.uid()) WITH CHECK(provider_user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.providers WHERE user_id=auth.uid()));
CREATE TABLE public.booking_direct_receipts (
 booking_id uuid PRIMARY KEY REFERENCES public.bookings(id),
 provider_user_id uuid NOT NULL,
 method text NOT NULL CHECK(method IN ('direct_ecocash','direct_bank')),
 account_snapshot jsonb NOT NULL,
 confirmed_at timestamptz,
 confirmed_by uuid,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.booking_direct_receipts TO authenticated;
GRANT ALL ON public.booking_direct_receipts TO service_role;
ALTER TABLE public.booking_direct_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY receipt_participants ON public.booking_direct_receipts FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.bookings b WHERE b.id=booking_id AND (b.customer_id=auth.uid() OR provider_user_id=auth.uid())));
CREATE FUNCTION public.booking_direct_accounts(_booking_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings; uid uuid; a public.provider_direct_accounts;
BEGIN
 SELECT * INTO b FROM public.bookings WHERE id=_booking_id;
 SELECT user_id INTO uid FROM public.providers WHERE id=b.provider_id;
 IF auth.uid() IS NULL OR NOT coalesce(b.customer_id=auth.uid() OR uid=auth.uid(),false) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF b.status NOT IN ('accepted','travelling','provider_arriving','arrived','in_progress','completed') THEN RETURN NULL; END IF;
 SELECT * INTO a FROM public.provider_direct_accounts WHERE provider_user_id=uid;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('accountHolder',a.account_holder,'ecocashNumber',a.ecocash_number,'bankName',a.bank_name,'bankAccount',a.bank_account);
END $$;
CREATE FUNCTION public.choose_booking_direct_payment(_booking_id uuid,_method text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings; uid uuid; a public.provider_direct_accounts; snapshot jsonb;
BEGIN
 SELECT * INTO b FROM public.bookings WHERE id=_booking_id FOR UPDATE;
 IF auth.uid() IS NULL OR b.customer_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _method NOT IN ('cash','direct_ecocash','direct_bank') OR b.status NOT IN ('accepted','travelling','provider_arriving','arrived','in_progress','completed') OR b.payment_status='paid' THEN RAISE EXCEPTION 'Payment cannot be changed'; END IF;
 IF EXISTS(SELECT 1 FROM public.booking_direct_receipts WHERE booking_id=b.id) THEN RAISE EXCEPTION 'Direct payment details are already locked; contact support before changing'; END IF;
 SELECT user_id INTO uid FROM public.providers WHERE id=b.provider_id;
 SELECT * INTO a FROM public.provider_direct_accounts WHERE provider_user_id=uid;
 IF _method='direct_ecocash' AND a.ecocash_number IS NULL THEN RAISE EXCEPTION 'Provider has not shared an EcoCash account'; END IF;
 IF _method='direct_bank' AND a.bank_account IS NULL THEN RAISE EXCEPTION 'Provider has not shared a bank account'; END IF;
 PERFORM set_config('zwits.trusted','on',true);
 IF _method<>'cash' THEN
 snapshot:=CASE WHEN _method='direct_ecocash' THEN jsonb_build_object('accountHolder',a.account_holder,'ecocashNumber',a.ecocash_number) ELSE jsonb_build_object('accountHolder',a.account_holder,'bankName',a.bank_name,'bankAccount',a.bank_account) END;
 INSERT INTO public.booking_direct_receipts(booking_id,provider_user_id,method,account_snapshot) VALUES(b.id,uid,_method,snapshot);
 END IF;
 UPDATE public.bookings SET payment_method=_method WHERE id=b.id;
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(uid,'Payment method selected','Your customer selected '||replace(_method,'_',' ')||'. Confirm receipt only after the agreed money arrives.','/m/provider/jobs/'||b.id,'payment_method');
 RETURN jsonb_build_object('ok',true);
END $$;
CREATE OR REPLACE FUNCTION public.settle_booking(_booking_id uuid) RETURNS TABLE(gross numeric,commission numeric,provider_earnings numeric) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings; uid uuid; g numeric; c numeric; direct boolean;
BEGIN
 IF NOT public.is_trusted_writer() THEN RAISE EXCEPTION 'Settlement is performed by the platform only'; END IF;
 SELECT * INTO b FROM public.bookings WHERE id=_booking_id FOR UPDATE;
 IF NOT FOUND OR b.status<>'completed' OR b.provider_id IS NULL THEN RAISE EXCEPTION 'Completed assigned booking required'; END IF;
 IF EXISTS(SELECT 1 FROM public.wallet_transactions WHERE reference='booking:'||b.id||':commission') THEN
 RETURN QUERY SELECT coalesce(b.price,b.budget,0),-w.amount,coalesce(b.price,b.budget,0)+w.amount FROM public.wallet_transactions w WHERE w.reference='booking:'||b.id||':commission'; RETURN;
 END IF;
 SELECT p.payment_method IN ('cash','direct_ecocash','direct_bank') INTO direct FROM public.payments p WHERE p.booking_id=b.id AND p.status='paid';
 IF direct IS NULL THEN RAISE EXCEPTION 'Payment is not confirmed'; END IF;
 SELECT user_id INTO uid FROM public.providers WHERE id=b.provider_id;
 g:=coalesce(b.price,b.budget,0); c:=public.calc_commission(b.category,g);
 PERFORM public.post_wallet_transaction(uid,'job_earning',g,'booking:'||b.id||':earning',b.id,NULL,NULL,'Job value for '||b.category);
 IF direct THEN PERFORM public.post_wallet_transaction(uid,'adjustment',-g,'booking:'||b.id||':cash_held',b.id,NULL,NULL,'Payment held directly by provider',true); END IF;
 PERFORM public.post_wallet_transaction(uid,'commission',-c,'booking:'||b.id||':commission',b.id,NULL,NULL,'Zwits commission on '||b.category,direct);
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(uid,CASE WHEN direct THEN 'Direct payment recorded' ELSE 'Earnings credited' END,CASE WHEN direct THEN 'You hold the customer payment. Commission is recorded as owed; no payout was credited.' ELSE 'Your wallet was credited for a completed job.' END,'/provider/dashboard','earnings_credited');
 RETURN QUERY SELECT g,c,g-c;
END $$;
CREATE FUNCTION public.confirm_direct_booking(_booking_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings; r public.booking_direct_receipts; p public.payments; t record;
BEGIN
 SELECT * INTO b FROM public.bookings WHERE id=_booking_id FOR UPDATE;
 SELECT * INTO r FROM public.booking_direct_receipts WHERE booking_id=b.id FOR UPDATE;
 IF auth.uid() IS NULL OR r.provider_user_id IS DISTINCT FROM auth.uid() OR NOT EXISTS(SELECT 1 FROM public.providers WHERE id=b.provider_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Only the assigned provider can confirm receipt'; END IF;
 IF b.status<>'completed' OR b.payment_method IS DISTINCT FROM r.method OR coalesce(b.price,b.budget,0)<=0 THEN RAISE EXCEPTION 'Completed direct-payment booking with agreed price required'; END IF;
 IF r.confirmed_at IS NOT NULL THEN RETURN (SELECT jsonb_build_object('ok',true,'gross',coalesce(b.price,b.budget),'commission',-amount,'providerEarnings',coalesce(b.price,b.budget)+amount) FROM public.wallet_transactions WHERE reference='booking:'||b.id||':commission'); END IF;
 PERFORM set_config('zwits.trusted','on',true);
 SELECT * INTO p FROM public.payments WHERE booking_id=b.id FOR UPDATE;
 IF FOUND AND (p.status NOT IN ('pending','processing') OR p.amount IS DISTINCT FROM coalesce(b.price,b.budget)) THEN RAISE EXCEPTION 'Payment mismatch; contact support'; END IF;
 IF p.id IS NULL THEN INSERT INTO public.payments(booking_id,customer_id,amount,payment_method,provider,status,paid_at,metadata) VALUES(b.id,b.customer_id,coalesce(b.price,b.budget),r.method,'provider_direct','paid',now(),jsonb_build_object('confirmed_by',auth.uid(),'verification','provider_attestation'));
 ELSE UPDATE public.payments SET payment_method=r.method,provider='provider_direct',status='paid',paid_at=now(),metadata=jsonb_build_object('confirmed_by',auth.uid(),'verification','provider_attestation') WHERE id=p.id; END IF;
 UPDATE public.bookings SET payment_status='paid' WHERE id=b.id;
 SELECT * INTO t FROM public.settle_booking(b.id);
 UPDATE public.booking_direct_receipts SET confirmed_at=now(),confirmed_by=auth.uid() WHERE booking_id=b.id;
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(b.customer_id,'Provider confirmed receipt','Your provider confirmed the direct payment. Zwits did not process this transfer.','/bookings/'||b.id,'payment_received');
 RETURN jsonb_build_object('ok',true,'gross',t.gross,'commission',t.commission,'providerEarnings',t.provider_earnings);
END $$;
REVOKE ALL ON FUNCTION public.booking_direct_accounts(uuid),public.choose_booking_direct_payment(uuid,text),public.confirm_direct_booking(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.booking_direct_accounts(uuid),public.choose_booking_direct_payment(uuid,text),public.confirm_direct_booking(uuid) TO authenticated;
