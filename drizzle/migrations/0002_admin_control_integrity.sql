CREATE OR REPLACE FUNCTION public.admin_decide_withdrawal(_id uuid, _outcome text, _reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w public.provider_withdrawals; debit numeric;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _outcome NOT IN ('processing','failed','cancelled') THEN RAISE EXCEPTION 'Payout settlement is unavailable until a verified payout rail is connected'; END IF;
 IF length(trim(coalesce(_reason,''))) < 3 THEN RAISE EXCEPTION 'A decision reason is required'; END IF;
 SELECT * INTO w FROM public.provider_withdrawals WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
 IF w.status=_outcome THEN RETURN jsonb_build_object('ok',true,'unchanged',true); END IF;
 IF w.status NOT IN ('requested','processing') THEN RAISE EXCEPTION 'Withdrawal is already final'; END IF;
 SELECT sum(amount) INTO debit FROM public.wallet_transactions WHERE withdrawal_id=w.id AND type='withdrawal' AND reference='withdrawal:'||w.id;
 IF debit IS DISTINCT FROM -w.amount THEN RAISE EXCEPTION 'Reserved ledger debit mismatch; investigate reconciliation'; END IF;
 IF _outcome IN ('failed','cancelled') THEN
 PERFORM public.post_wallet_transaction(w.provider_user_id,'refund',w.amount,'withdrawal:'||w.id||':reversal',NULL,NULL,w.id,_reason);
 END IF;
 UPDATE public.provider_withdrawals SET status=_outcome,failure_reason=_reason,processed_at=CASE WHEN _outcome='processing' THEN NULL ELSE now() END WHERE id=w.id;
 PERFORM public.log_admin_action('withdrawal_'||_outcome,'withdrawal',w.id,jsonb_build_object('amount',w.amount,'reason',_reason));
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(w.provider_user_id,'Withdrawal '||_outcome,CASE WHEN _outcome='processing' THEN 'Your request is under review. No payout has been sent.' ELSE 'Your reserved funds were returned to your wallet.' END,'/provider/dashboard','withdrawal_'||_outcome);
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.admin_decide_withdrawal(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_withdrawal(uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.request_wallet_withdrawal(_amount numeric,_method text,_destination text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w public.provider_wallets; v_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'driver')) THEN RAISE EXCEPTION 'Provider or driver account required'; END IF;
 IF _method <> 'cash' THEN RAISE EXCEPTION 'Electronic payout methods are not connected'; END IF;
 IF _amount IS NULL OR _amount<=0 OR _amount>100000 OR length(trim(coalesce(_destination,'')))<4 THEN RAISE EXCEPTION 'Invalid withdrawal request'; END IF;
 SELECT * INTO w FROM public.provider_wallets WHERE provider_user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR w.available_balance<_amount THEN RAISE EXCEPTION 'Insufficient withdrawable balance'; END IF;
 IF EXISTS(SELECT 1 FROM public.provider_withdrawals WHERE provider_user_id=auth.uid() AND status IN ('requested','processing')) THEN RAISE EXCEPTION 'A withdrawal is already in progress'; END IF;
 INSERT INTO public.provider_withdrawals(provider_user_id,amount,method,destination,status) VALUES(auth.uid(),_amount,_method,trim(_destination),'requested') RETURNING id INTO v_id;
 PERFORM set_config('zwits.trusted','on',true);
 PERFORM public.post_wallet_transaction(auth.uid(),'withdrawal',-_amount,'withdrawal:'||v_id,NULL,NULL,v_id,'Withdrawal funds reserved');
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(auth.uid(),'Withdrawal requested','Your request is reserved for review; no payout has been sent.','/provider/dashboard','withdrawal_requested');
 RETURN jsonb_build_object('ok',true,'withdrawalId',v_id);
END $$;
REVOKE ALL ON FUNCTION public.request_wallet_withdrawal(numeric,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_wallet_withdrawal(numeric,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(_id uuid,_status text,_resolution text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.disputes;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _status NOT IN ('investigating','resolved','rejected') OR length(trim(coalesce(_resolution,'')))<3 THEN RAISE EXCEPTION 'A valid decision and reason are required'; END IF;
 SELECT * INTO d FROM public.disputes WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Dispute not found'; END IF;
 IF d.status NOT IN ('open','investigating') THEN RAISE EXCEPTION 'Dispute is already final'; END IF;
 UPDATE public.disputes SET status=_status,resolution=_resolution,resolved_by=CASE WHEN _status='investigating' THEN NULL ELSE auth.uid() END,resolved_at=CASE WHEN _status='investigating' THEN NULL ELSE now() END WHERE id=d.id;
 PERFORM public.log_admin_action('dispute_'||_status,'dispute',d.id,jsonb_build_object('reason',_resolution,'financial_adjustment',false));
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(d.opened_by,'Dispute '||_status,_resolution,CASE WHEN d.booking_id IS NOT NULL THEN '/bookings/'||d.booking_id ELSE '/deliveries/'||d.delivery_id END,'dispute_'||_status);
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.admin_resolve_dispute(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_dispute(uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.withdrawal_write_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_trusted_writer() THEN RAISE EXCEPTION 'Withdrawal writes require the authorized wallet workflow'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER withdrawal_write_guard BEFORE INSERT OR UPDATE ON public.provider_withdrawals FOR EACH ROW EXECUTE FUNCTION public.withdrawal_write_guard();