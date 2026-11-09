CREATE OR REPLACE FUNCTION public.dispute_submission_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s text; participant boolean;
BEGIN
 IF (NEW.booking_id IS NULL) = (NEW.delivery_id IS NULL) THEN RAISE EXCEPTION 'Choose one booking or delivery'; END IF;
 IF NEW.booking_id IS NOT NULL THEN
  SELECT b.status::text, (b.customer_id=auth.uid() OR p.user_id=auth.uid()) INTO s,participant FROM public.bookings b LEFT JOIN public.providers p ON p.id=b.provider_id WHERE b.id=NEW.booking_id FOR UPDATE OF b;
 ELSE
  SELECT d.status,(d.customer_id=auth.uid() OR d.driver_id=auth.uid()) INTO s,participant FROM public.deliveries d WHERE d.id=NEW.delivery_id FOR UPDATE;
 END IF;
 IF auth.uid() IS NULL OR NOT coalesce(participant,false) THEN RAISE EXCEPTION 'Not a participant'; END IF;
 IF s NOT IN ('accepted','travelling','provider_arriving','arrived','in_progress','completed','cancelled','disputed','arriving','picked_up','delivered','failed','refunded') THEN RAISE EXCEPTION 'This request is not eligible for an issue yet'; END IF;
 IF EXISTS(SELECT 1 FROM public.disputes d WHERE ((NEW.booking_id IS NOT NULL AND d.booking_id=NEW.booking_id) OR (NEW.delivery_id IS NOT NULL AND d.delivery_id=NEW.delivery_id)) AND d.status IN ('open','investigating')) THEN RAISE EXCEPTION 'An issue is already open for this request'; END IF;
 IF length(trim(coalesce(NEW.reason,''))) NOT BETWEEN 3 AND 120 OR length(coalesce(NEW.description,''))>2000 THEN RAISE EXCEPTION 'Invalid issue details'; END IF;
 NEW.opened_by:=auth.uid(); NEW.status:='open'; NEW.resolution:=NULL; NEW.resolved_by:=NULL; NEW.resolved_at:=NULL;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_dispute_submission BEFORE INSERT ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.dispute_submission_guard();
REVOKE UPDATE,DELETE ON public.disputes FROM authenticated;
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(_id uuid,_status text,_resolution text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.disputes;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _status NOT IN ('investigating','resolved','rejected') OR length(trim(coalesce(_resolution,''))) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'A valid decision and reason are required'; END IF;
 SELECT * INTO d FROM public.disputes WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Dispute not found'; END IF;
 IF d.status NOT IN ('open','investigating') THEN RAISE EXCEPTION 'Dispute is already final'; END IF;
 UPDATE public.disputes SET status=_status,resolution=trim(_resolution),resolved_by=CASE WHEN _status='investigating' THEN NULL ELSE auth.uid() END,resolved_at=CASE WHEN _status='investigating' THEN NULL ELSE now() END WHERE id=d.id;
 PERFORM public.log_admin_action('dispute_'||_status,'dispute',d.id,jsonb_build_object('reason',_resolution,'financial_adjustment',false));
 INSERT INTO public.notifications(user_id,title,body,link,kind)
 SELECT u,'Issue '||_status,_resolution,'/disputes','dispute_'||_status FROM (
 SELECT d.opened_by u UNION SELECT b.customer_id FROM public.bookings b WHERE b.id=d.booking_id UNION SELECT p.user_id FROM public.bookings b JOIN public.providers p ON p.id=b.provider_id WHERE b.id=d.booking_id UNION SELECT v.customer_id FROM public.deliveries v WHERE v.id=d.delivery_id UNION SELECT v.driver_id FROM public.deliveries v WHERE v.id=d.delivery_id
 ) parties WHERE u IS NOT NULL;
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.admin_resolve_dispute(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_dispute(uuid,text,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_review_provider(_id uuid,_status text,_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.providers; state public.provider_verification_status;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _status NOT IN ('approved','rejected','revoked','pending') OR length(trim(coalesce(_reason,''))) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Valid review state and reason required'; END IF;
 SELECT * INTO p FROM public.providers WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Provider not found'; END IF;
 IF _status='approved' AND (p.id_document_url IS NULL OR p.selfie_url IS NULL OR p.business_doc_url IS NULL OR EXISTS(SELECT 1 FROM public.provider_documents WHERE provider_user_id=p.user_id AND (verification_status='rejected' OR expiry_date<current_date))) THEN RAISE EXCEPTION 'Valid ID, selfie and business documents are required before approval'; END IF;
 state:=CASE WHEN _status='rejected' THEN 'revoked'::public.provider_verification_status ELSE _status::public.provider_verification_status END;
 UPDATE public.providers SET verification_status=state,verified=(_status='approved'),available=false,reviewed_by=auth.uid(),reviewed_at=now(),revoke_reason=CASE WHEN state='revoked' THEN trim(_reason) ELSE NULL END WHERE id=p.id;
 INSERT INTO public.provider_document_audits(provider_user_id,doc_key,status,errors) VALUES(p.user_id,'verification_review',_status,ARRAY[trim(_reason)]);
 PERFORM public.log_admin_action('provider_'||_status,'provider',p.id,jsonb_build_object('reason',trim(_reason),'previous_status',p.verification_status));
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(p.user_id,'Verification '||_status,trim(_reason),'/provider/dashboard?section=documents','verification_'||_status);
 RETURN jsonb_build_object('ok',true,'status',_status);
END $$;
REVOKE ALL ON FUNCTION public.admin_review_provider(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_review_provider(uuid,text,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.confirm_cash_booking(_booking_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings; uid uuid; payment public.payments; totals record;
BEGIN
 SELECT * INTO b FROM public.bookings WHERE id=_booking_id FOR UPDATE;
 SELECT user_id INTO uid FROM public.providers WHERE id=b.provider_id;
 IF auth.uid() IS NULL OR NOT(coalesce(uid=auth.uid(),false) OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Only the assigned provider can confirm cash'; END IF;
 IF b.status<>'completed' OR b.payment_method IS DISTINCT FROM 'cash' THEN RAISE EXCEPTION 'A completed cash booking is required'; END IF;
 IF coalesce(b.price,b.budget,0)<=0 THEN RAISE EXCEPTION 'This booking has no agreed price yet'; END IF;
 PERFORM set_config('zwits.trusted','on',true);
 SELECT * INTO payment FROM public.payments WHERE booking_id=b.id FOR UPDATE;
 IF FOUND AND (payment.payment_method<>'cash' OR payment.status='refunded' OR payment.amount IS DISTINCT FROM coalesce(b.price,b.budget)) THEN RAISE EXCEPTION 'Payment mismatch; contact support'; END IF;
 IF b.payment_status='paid' AND EXISTS(SELECT 1 FROM public.wallet_transactions WHERE reference='booking:'||b.id||':commission') THEN
  RETURN (SELECT jsonb_build_object('ok',true,'gross',coalesce(b.price,b.budget),'commission',-amount,'providerEarnings',coalesce(b.price,b.budget)+amount) FROM public.wallet_transactions WHERE reference='booking:'||b.id||':commission');
 END IF;
 IF payment.id IS NULL THEN
  INSERT INTO public.payments(booking_id,customer_id,amount,payment_method,provider,status,paid_at) VALUES(b.id,b.customer_id,coalesce(b.price,b.budget),'cash','cash','paid',now());
 ELSE UPDATE public.payments SET status='paid',paid_at=coalesce(paid_at,now()) WHERE id=payment.id; END IF;
 UPDATE public.bookings SET payment_status='paid' WHERE id=b.id;
 SELECT * INTO totals FROM public.settle_booking(b.id);
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(b.customer_id,'Cash payment recorded','Your provider confirmed receipt of cash.','/bookings/'||b.id,'payment_received');
 RETURN jsonb_build_object('ok',true,'gross',totals.gross,'commission',totals.commission,'providerEarnings',totals.provider_earnings);
END $$;
REVOKE ALL ON FUNCTION public.confirm_cash_booking(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_cash_booking(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.provider_job_accounts() RETURNS TABLE(booking_id uuid,gross numeric,commission numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT b.id,coalesce(sum(w.amount) FILTER(WHERE w.type='job_earning'),0),-coalesce(sum(w.amount) FILTER(WHERE w.type='commission'),0) FROM public.bookings b JOIN public.providers p ON p.id=b.provider_id JOIN public.wallet_transactions w ON w.booking_id=b.id WHERE p.user_id=auth.uid() GROUP BY b.id
$$;
REVOKE ALL ON FUNCTION public.provider_job_accounts() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.provider_job_accounts() TO authenticated;