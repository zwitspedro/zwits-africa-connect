CREATE OR REPLACE FUNCTION public.admin_period_metrics(_from timestamptz,_to timestamptz) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _from IS NULL OR _to IS NULL OR _from>=_to OR _to-_from>interval '367 days' THEN RAISE EXCEPTION 'Select a date range of at most one year'; END IF;
 SELECT jsonb_build_object(
 'customers',(SELECT count(*) FROM public.user_roles WHERE role='customer' AND created_at>=_from AND created_at<_to),
 'providers',(SELECT count(*) FROM public.providers),
 'approvedProviders',(SELECT count(*) FROM public.providers WHERE verification_status='approved'),
 'revokedProviders',(SELECT count(*) FROM public.providers WHERE verification_status='revoked'),
 'pendingVerification',(SELECT count(*) FROM public.providers WHERE verification_status='pending'),
 'onlineProviders',(SELECT count(*) FROM public.providers WHERE verification_status='approved' AND available),
 'onlineDrivers',(SELECT count(*) FROM public.driver_profiles WHERE verification_status='approved' AND available),
 'activeJobs',(SELECT count(*) FROM public.bookings WHERE status IN ('matching','offered','pending','accepted','travelling','provider_arriving','arrived','in_progress')),
 'activeDeliveries',(SELECT count(*) FROM public.deliveries WHERE status NOT IN ('delivered','cancelled','failed')),
 'completedJobs',(SELECT count(*) FROM public.bookings WHERE status='completed' AND completed_at>=_from AND completed_at<_to),
 'completedDeliveries',(SELECT count(*) FROM public.deliveries WHERE status='delivered' AND delivered_at>=_from AND delivered_at<_to),
 'cancelledJobs',(SELECT count(*) FROM public.bookings WHERE status='cancelled' AND updated_at>=_from AND updated_at<_to),
 'grossTransactionValue',coalesce((SELECT sum(price) FROM public.bookings WHERE status='completed' AND completed_at>=_from AND completed_at<_to),0)+coalesce((SELECT sum(price) FROM public.deliveries WHERE status='delivered' AND delivered_at>=_from AND delivered_at<_to),0),
 'revenue',coalesce((SELECT sum(amount) FROM public.payments WHERE status='paid' AND paid_at>=_from AND paid_at<_to AND currency='USD'),0),
 'cashPayments',coalesce((SELECT sum(amount) FROM public.payments WHERE status='paid' AND payment_method='cash' AND paid_at>=_from AND paid_at<_to AND currency='USD'),0),
 'electronicPayments',coalesce((SELECT sum(amount) FROM public.payments WHERE status='paid' AND payment_method<>'cash' AND paid_at>=_from AND paid_at<_to AND currency='USD'),0),
 'commission',-coalesce((SELECT sum(amount) FROM public.wallet_transactions WHERE type='commission' AND created_at>=_from AND created_at<_to),0),
 'providerEarnings',coalesce((SELECT sum(amount) FROM public.wallet_transactions WHERE type IN ('job_earning','commission') AND created_at>=_from AND created_at<_to),0),
 'walletLiabilities',coalesce((SELECT sum(greatest(available_balance,0)) FROM public.provider_wallets WHERE currency='USD'),0),
 'commissionDebt',-coalesce((SELECT sum(least(available_balance,0)) FROM public.provider_wallets WHERE currency='USD'),0),
 'pendingWithdrawals',(SELECT count(*) FROM public.provider_withdrawals WHERE status IN ('requested','processing')),
 'pendingWithdrawalValue',coalesce((SELECT sum(amount) FROM public.provider_withdrawals WHERE status IN ('requested','processing')),0),
 'settledWithdrawalValue',coalesce((SELECT sum(amount) FROM public.provider_withdrawals WHERE status='paid' AND processed_at>=_from AND processed_at<_to),0),
 'openDisputes',(SELECT count(*) FROM public.disputes WHERE status IN ('open','investigating')),
 'failedPayments',(SELECT count(*) FROM public.payments WHERE status='failed' AND created_at>=_from AND created_at<_to),
 'auditEvents',(SELECT count(*) FROM public.admin_audit_log WHERE created_at>=_from AND created_at<_to),
 'failedUploads',(SELECT count(*) FROM public.provider_document_audits WHERE status IN ('rejected','upload_error') AND created_at>=_from AND created_at<_to),
 'ratingsCount',(SELECT count(*) FROM public.ratings WHERE created_at>=_from AND created_at<_to),
 'avgRating',(SELECT round(avg(rating),2) FROM public.ratings WHERE created_at>=_from AND created_at<_to),
 'checkedAt',now()
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_period_metrics(timestamptz,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_period_metrics(timestamptz,timestamptz) TO authenticated;