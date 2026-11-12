CREATE OR REPLACE FUNCTION public.provider_cash_reconciliation() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); result jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT jsonb_build_object('cash_received',coalesce(sum(-h.amount) FILTER(WHERE b.payment_method='cash'),0),'cash_commission',coalesce(sum(-c.amount) FILTER(WHERE b.payment_method='cash'),0),'direct_received',coalesce(sum(-h.amount) FILTER(WHERE b.payment_method IN ('direct_ecocash','direct_bank')),0),'direct_commission',coalesce(sum(-c.amount) FILTER(WHERE b.payment_method IN ('direct_ecocash','direct_bank')),0),'cash_jobs',count(*) FILTER(WHERE b.payment_method='cash')) INTO result
 FROM public.wallet_transactions h JOIN public.bookings b ON b.id=h.booking_id
 JOIN public.wallet_transactions c ON c.reference='booking:'||b.id||':commission' AND c.provider_user_id=uid
 WHERE h.provider_user_id=uid AND h.reference='booking:'||b.id||':cash_held' AND b.payment_status='paid';
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.provider_cash_reconciliation() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.provider_cash_reconciliation() TO authenticated,service_role;