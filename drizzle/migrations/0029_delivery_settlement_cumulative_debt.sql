CREATE OR REPLACE FUNCTION public.post_delivery_settlement_internal(_id uuid,_gross numeric,_commission numeric)
RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE d public.deliveries; p public.payments; held boolean;
BEGIN
 SELECT * INTO d FROM public.deliveries WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR d.status IS DISTINCT FROM 'delivered' OR d.driver_id IS NULL OR d.payment_status IS DISTINCT FROM 'paid' THEN RAISE EXCEPTION 'Completed paid assigned delivery required'; END IF;
 SELECT * INTO p FROM public.payments WHERE delivery_id=d.id FOR UPDATE;
 IF NOT FOUND OR p.status IS DISTINCT FROM 'paid' OR p.customer_id IS DISTINCT FROM d.customer_id OR p.amount IS DISTINCT FROM d.price OR p.currency IS DISTINCT FROM 'USD' OR p.payment_method IS DISTINCT FROM d.payment_method OR _gross IS DISTINCT FROM p.amount OR _gross<=0 OR _commission IS DISTINCT FROM public.calc_commission('delivery',_gross) THEN RAISE EXCEPTION 'Matching settlement amounts and payment required'; END IF;
 IF EXISTS(SELECT 1 FROM public.wallet_transactions WHERE reference IN ('delivery:'||d.id||':earning','delivery:'||d.id||':cash_held','delivery:'||d.id||':commission')) THEN RAISE EXCEPTION 'Settlement already posted; use validated replay'; END IF;
 held:=p.payment_method IN ('cash','direct_ecocash','direct_bank');
 -- Owner-only, invoker-rights helper. The settlement owner retains the wallet
 -- row lock across all three posts; clients cannot acquire this exception.
 PERFORM public.post_wallet_transaction(d.driver_id,'job_earning',_gross,'delivery:'||d.id||':earning',NULL,d.id,NULL,'Delivery gross earnings',true);
 IF held THEN PERFORM public.post_wallet_transaction(d.driver_id,'adjustment',-_gross,'delivery:'||d.id||':cash_held',NULL,d.id,NULL,'Customer payment already held by driver; not platform funds',true); END IF;
 PERFORM public.post_wallet_transaction(d.driver_id,'commission',-_commission,'delivery:'||d.id||':commission',NULL,d.id,NULL,'Zwits commission on delivery',true);
END $$;
REVOKE ALL ON FUNCTION public.post_delivery_settlement_internal(uuid,numeric,numeric) FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION public.post_delivery_settlement_internal(uuid,numeric,numeric) IS 'Owner-only invoker-rights delivery settlement posting. Validates job/payment/amounts and derives stable references. Existing general wallet and withdrawal protections are unchanged.';

CREATE OR REPLACE FUNCTION public.settle_delivery(_delivery_id uuid)
RETURNS TABLE(gross numeric,commission numeric,provider_earnings numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.deliveries; p public.payments; g numeric; c numeric; held boolean; e public.wallet_transactions; w public.wallet_transactions; h public.wallet_transactions;
BEGIN
 IF NOT coalesce(public.is_trusted_writer(),false) THEN RAISE EXCEPTION 'Settlement is performed by the platform only'; END IF;
 SELECT * INTO d FROM public.deliveries WHERE id=_delivery_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
 IF d.status IS DISTINCT FROM 'delivered' OR d.driver_id IS NULL THEN RAISE EXCEPTION 'Completed assigned delivery required'; END IF;
 SELECT * INTO p FROM public.payments WHERE delivery_id=d.id FOR UPDATE;
 IF NOT FOUND OR p.status IS DISTINCT FROM 'paid' OR d.payment_status IS DISTINCT FROM 'paid' OR p.customer_id IS DISTINCT FROM d.customer_id OR p.amount IS DISTINCT FROM d.price OR p.currency IS DISTINCT FROM 'USD' OR p.payment_method IS DISTINCT FROM d.payment_method THEN RAISE EXCEPTION 'Confirmed matching payment required'; END IF;
 held:=p.payment_method IN ('cash','direct_ecocash','direct_bank');
 SELECT * INTO e FROM public.wallet_transactions WHERE reference='delivery:'||d.id||':earning';
 SELECT * INTO w FROM public.wallet_transactions WHERE reference='delivery:'||d.id||':commission';
 SELECT * INTO h FROM public.wallet_transactions WHERE reference='delivery:'||d.id||':cash_held';
 IF e.id IS NOT NULL OR w.id IS NOT NULL OR h.id IS NOT NULL THEN
  IF e.id IS NULL OR w.id IS NULL OR (held AND h.id IS NULL) OR (NOT held AND h.id IS NOT NULL) OR e.provider_user_id IS DISTINCT FROM d.driver_id OR w.provider_user_id IS DISTINCT FROM d.driver_id OR e.delivery_id IS DISTINCT FROM d.id OR w.delivery_id IS DISTINCT FROM d.id OR e.type<>'job_earning' OR w.type<>'commission' OR e.amount IS DISTINCT FROM p.amount OR w.amount>0 OR (held AND (h.amount IS DISTINCT FROM -e.amount OR h.provider_user_id IS DISTINCT FROM d.driver_id OR h.delivery_id IS DISTINCT FROM d.id OR h.type<>'adjustment')) THEN RAISE EXCEPTION 'Existing settlement requires investigation; ledger preserved'; END IF;
  RETURN QUERY SELECT e.amount,-w.amount,e.amount+w.amount; RETURN;
 END IF;
 g:=d.price;
 IF g IS NULL OR g<=0 THEN RAISE EXCEPTION 'Positive agreed delivery price required'; END IF;
 c:=public.calc_commission('delivery',g);
 PERFORM public.post_delivery_settlement_internal(d.id,g,c);
 PERFORM public.log_delivery_event(d.id,'delivery_settled',auth.uid(),jsonb_build_object('gross',g,'commission',c,'driver_earnings',g-c,'driver_held',held,'reason','Completed delivery with matching confirmed payment'),'delivery_settled');
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(d.driver_id,CASE WHEN held THEN 'Direct payment recorded' ELSE 'Earnings credited' END,CASE WHEN held THEN 'You hold the customer payment. Commission is recorded as owed; no payout was credited.' ELSE 'Your wallet was credited for a completed delivery.' END,'/driver','earnings_credited');
 RETURN QUERY SELECT g,c,g-c;
END $$;
REVOKE ALL ON FUNCTION public.settle_delivery(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.settle_delivery(uuid) TO service_role;