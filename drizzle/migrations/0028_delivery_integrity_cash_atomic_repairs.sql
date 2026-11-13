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
 PERFORM public.post_wallet_transaction(d.driver_id,'job_earning',g,'delivery:'||d.id||':earning',NULL,d.id,NULL,'Delivery gross earnings');
 IF held THEN PERFORM public.post_wallet_transaction(d.driver_id,'adjustment',-g,'delivery:'||d.id||':cash_held',NULL,d.id,NULL,'Customer payment already held by driver; not platform funds',true); END IF;
 PERFORM public.post_wallet_transaction(d.driver_id,'commission',-c,'delivery:'||d.id||':commission',NULL,d.id,NULL,'Zwits commission on delivery',held);
 PERFORM public.log_delivery_event(d.id,'delivery_settled',auth.uid(),jsonb_build_object('gross',g,'commission',c,'driver_earnings',g-c,'driver_held',held,'reason','Completed delivery with matching confirmed payment'),'delivery_settled');
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(d.driver_id,CASE WHEN held THEN 'Direct payment recorded' ELSE 'Earnings credited' END,CASE WHEN held THEN 'You hold the customer payment. Commission is recorded as owed; no payout was credited.' ELSE 'Your wallet was credited for a completed delivery.' END,'/driver','earnings_credited');
 RETURN QUERY SELECT g,c,g-c;
END $$;
REVOKE ALL ON FUNCTION public.settle_delivery(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.settle_delivery(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.update_delivery_progress_atomic(_id uuid,_status text,_proof text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.deliveries; actor uuid:=auth.uid(); allowed boolean; prior_trust text:=coalesce(current_setting('zwits.trusted',true),''); proof_path text; recipient uuid;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO d FROM public.deliveries WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
 allowed:=coalesce(d.driver_id=actor,false) OR (coalesce(d.customer_id=actor,false) AND coalesce(_status='cancelled',false));
 IF allowed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Not allowed'; END IF;
 IF _status IS NULL OR _status NOT IN ('picked_up','delivered','cancelled') OR NOT coalesce(public.delivery_transition_allowed(d.status,_status),false) THEN RAISE EXCEPTION 'Invalid delivery transition'; END IF;
 IF _status<>'cancelled' AND public.dispatch_job_blocked('delivery',_id) THEN RAISE EXCEPTION 'Job is on hold or awaiting approval'; END IF;
 IF _status='delivered' THEN
  proof_path:=CASE WHEN d.status='delivered' THEN d.proof_photo_url ELSE _proof END;
  IF proof_path IS NULL OR proof_path !~ ('^'||actor::text||'/'||d.id::text||'/delivery-proof-[0-9a-f-]+\.(jpg|png|webp)$') OR d.picked_up_at IS NULL OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='job-photos' AND o.name=proof_path AND (o.owner_id=actor::text OR o.owner=actor) AND o.created_at>=d.picked_up_at AND o.metadata->>'mimetype' IN ('image/jpeg','image/png','image/webp')) THEN RAISE EXCEPTION 'Upload authorised delivery-specific evidence after pickup before completing'; END IF;
 END IF;
 IF d.status=_status THEN RETURN jsonb_build_object('ok',true,'unchanged',true); END IF;
 PERFORM set_config('zwits.trusted','on',true);
 UPDATE public.deliveries SET status=_status,picked_up_at=CASE WHEN _status='picked_up' THEN now() ELSE picked_up_at END,delivered_at=CASE WHEN _status='delivered' THEN now() ELSE delivered_at END,proof_photo_url=CASE WHEN _status='delivered' THEN proof_path ELSE proof_photo_url END WHERE id=_id;
 IF _status='delivered' THEN UPDATE public.driver_profiles SET deliveries_completed=deliveries_completed+1 WHERE user_id=d.driver_id; END IF;
 PERFORM public.log_delivery_event(_id,'delivery_'||_status,actor,jsonb_build_object('proof',proof_path,'old_status',d.status,'reason','Participant confirmed delivery progress'),NULL);
 recipient:=CASE WHEN actor=d.driver_id THEN d.customer_id ELSE d.driver_id END;
 IF recipient IS NOT NULL THEN INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(recipient,'Delivery progress updated',replace(_status,'_',' '),'/deliveries/'||_id,'delivery_'||_status); END IF;
 IF _status='delivered' AND d.payment_status='paid' THEN PERFORM public.settle_delivery(_id); END IF;
 PERFORM set_config('zwits.trusted',prior_trust,true);
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.update_delivery_progress_atomic(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_delivery_progress_atomic(uuid,text,text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.confirm_cash_delivery(_delivery_id uuid,_reason text DEFAULT 'Assigned driver confirmed cash received on delivery')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.deliveries; p public.payments; actor uuid:=auth.uid(); t record; already_settled boolean; prior_trust text:=coalesce(current_setting('zwits.trusted',true),'');
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO d FROM public.deliveries WHERE id=_delivery_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
 IF coalesce(d.driver_id=actor,false) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Only the assigned driver can confirm receipt of cash'; END IF;
 IF d.status IS DISTINCT FROM 'delivered' OR d.payment_method IS DISTINCT FROM 'cash' OR coalesce(d.price,0)<=0 THEN RAISE EXCEPTION 'Completed cash delivery with an agreed price required'; END IF;
 IF _reason IS NULL OR length(trim(_reason))<5 OR length(_reason)>500 THEN RAISE EXCEPTION 'Receipt reason required'; END IF;
 IF d.proof_photo_url IS NULL OR d.proof_photo_url !~ ('^'||actor::text||'/'||d.id::text||'/delivery-proof-[0-9a-f-]+\.(jpg|png|webp)$') OR d.picked_up_at IS NULL OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='job-photos' AND o.name=d.proof_photo_url AND (o.owner_id=actor::text OR o.owner=actor) AND o.created_at>=d.picked_up_at AND o.metadata->>'mimetype' IN ('image/jpeg','image/png','image/webp')) THEN RAISE EXCEPTION 'Valid delivery-specific proof required'; END IF;
 SELECT * INTO p FROM public.payments WHERE delivery_id=d.id FOR UPDATE;
 IF FOUND AND (p.customer_id IS DISTINCT FROM d.customer_id OR p.payment_method IS DISTINCT FROM 'cash' OR p.status IN ('refunded','cancelled','failed') OR p.amount IS DISTINCT FROM d.price OR p.currency IS DISTINCT FROM 'USD') THEN RAISE EXCEPTION 'Payment mismatch; contact support'; END IF;
 already_settled:=EXISTS(SELECT 1 FROM public.wallet_transactions WHERE reference='delivery:'||d.id||':commission');
 PERFORM set_config('zwits.trusted','on',true);
 IF p.id IS NULL THEN
  INSERT INTO public.payments(delivery_id,customer_id,amount,currency,payment_method,provider,status,paid_at,metadata) VALUES(d.id,d.customer_id,d.price,'USD','cash','cash','paid',now(),jsonb_build_object('confirmed_by',actor,'reason',trim(_reason)));
 ELSIF p.status<>'paid' THEN
  UPDATE public.payments SET status='paid',paid_at=coalesce(paid_at,now()),failure_reason=NULL,metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('confirmed_by',actor,'reason',trim(_reason)) WHERE id=p.id;
 END IF;
 UPDATE public.deliveries SET payment_status='paid' WHERE id=d.id AND payment_status IS DISTINCT FROM 'paid';
 SELECT * INTO t FROM public.settle_delivery(d.id);
 IF NOT already_settled THEN
  PERFORM public.log_delivery_event(d.id,'cash_receipt_confirmed',actor,jsonb_build_object('reason',trim(_reason),'gross',t.gross,'commission',t.commission,'provider_earnings',t.provider_earnings),'cash_receipt_confirmed');
  INSERT INTO public.admin_audit_log(actor,action,subject_type,subject_id,metadata) VALUES(actor,'delivery_cash_confirmed','delivery',d.id,jsonb_build_object('reason',trim(_reason),'gross',t.gross,'commission',t.commission));
  INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(d.customer_id,'Delivery cash recorded','Your assigned driver confirmed receipt of cash.','/deliveries/'||d.id,'payment_complete');
 END IF;
 PERFORM set_config('zwits.trusted',prior_trust,true);
 RETURN jsonb_build_object('ok',true,'gross',t.gross,'commission',t.commission,'providerEarnings',t.provider_earnings,'unchanged',already_settled);
END $$;
REVOKE ALL ON FUNCTION public.confirm_cash_delivery(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_cash_delivery(uuid,text) TO authenticated;
COMMENT ON FUNCTION public.confirm_cash_delivery(uuid,text) IS 'Assigned-driver cash receipt, matching payment, delivery paid marker, immutable settlement and actor/reason audit commit atomically. Transactional in-app notices become visible only after commit; no outbound transfer.';