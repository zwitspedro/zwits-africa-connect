-- Requires a privileged test connection. All fixture changes roll back.
\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE a uuid; u uuid; c uuid; p uuid; b uuid; issue uuid; n int; balance numeric; result jsonb;
BEGIN
 SELECT user_id INTO a FROM public.user_roles WHERE role='admin' ORDER BY created_at LIMIT 1;
 SELECT user_id,id INTO u,p FROM public.providers WHERE user_id=a LIMIT 1;
 SELECT user_id INTO c FROM public.profiles WHERE user_id<>u ORDER BY created_at LIMIT 1;
 IF a IS NULL OR u IS NULL OR c IS NULL THEN RAISE EXCEPTION 'Test requires admin provider and another account'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 PERFORM set_config('zwits.trusted','on',true);
 INSERT INTO public.bookings(customer_id,provider_id,category,address,status,price,payment_method) VALUES(c,p,'plumbing','ROLLED BACK workflow test','in_progress',100,'cash') RETURNING id INTO b;
 UPDATE public.bookings SET status='completed' WHERE id=b;
 IF (SELECT completed_at FROM public.bookings WHERE id=b) IS NULL THEN RAISE EXCEPTION 'Completion timestamp absent'; END IF;
 SELECT coalesce(available_balance,0) INTO balance FROM public.provider_wallets WHERE provider_user_id=u;
 result:=public.confirm_cash_booking(b);
 IF (result->>'commission')::numeric<>10 OR (result->>'providerEarnings')::numeric<>90 THEN RAISE EXCEPTION 'Cash income mismatch'; END IF;
 IF (SELECT available_balance FROM public.provider_wallets WHERE provider_user_id=u)<>coalesce(balance,0)-10 THEN RAISE EXCEPTION 'Cash commission debt mismatch'; END IF;
 PERFORM public.confirm_cash_booking(b);
 SELECT count(*) INTO n FROM public.wallet_transactions WHERE booking_id=b;
 IF n<>3 THEN RAISE EXCEPTION 'Repeated confirmation duplicated ledger'; END IF;
 IF (SELECT payment_status FROM public.bookings WHERE id=b)<>'paid' THEN RAISE EXCEPTION 'Payment did not read back'; END IF;
 IF (SELECT count(*) FROM public.provider_job_accounts() WHERE booking_id=b AND gross=100 AND commission=10)<>1 THEN RAISE EXCEPTION 'Historical income lookup wrong'; END IF;
 INSERT INTO public.disputes(booking_id,opened_by,reason) VALUES(b,u,'Cash issue test') RETURNING id INTO issue;
 BEGIN INSERT INTO public.disputes(booking_id,opened_by,reason) VALUES(b,u,'Duplicate test'); RAISE EXCEPTION 'FAIL duplicate accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'An issue is already open for this request' THEN RAISE; END IF; END;
 PERFORM public.admin_resolve_dispute(issue,'investigating','Checking both parties');
 PERFORM public.admin_resolve_dispute(issue,'resolved','Recorded agreed resolution');
 IF (SELECT resolution FROM public.disputes WHERE id=issue)<>'Recorded agreed resolution' THEN RAISE EXCEPTION 'Resolution missing'; END IF;
 IF (SELECT count(*) FROM public.notifications WHERE kind='dispute_resolved' AND body='Recorded agreed resolution' AND user_id IN (u,c))<>2 THEN RAISE EXCEPTION 'Both parties not notified'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',c,'role','authenticated')::text,true);
 BEGIN PERFORM public.confirm_cash_booking(b); RAISE EXCEPTION 'FAIL customer cash confirmation accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Only the assigned provider can confirm cash' THEN RAISE; END IF; END;
 BEGIN PERFORM public.admin_resolve_dispute(issue,'resolved','Unauthorized'); RAISE EXCEPTION 'FAIL customer resolution accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Forbidden' THEN RAISE; END IF; END;
 BEGIN PERFORM public.admin_review_provider(p,'rejected','Unauthorized'); RAISE EXCEPTION 'FAIL customer review accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Forbidden' THEN RAISE; END IF; END;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 PERFORM public.admin_review_provider(p,'rejected','Rolled back rejection test');
 IF (SELECT available FROM providers WHERE id=p) OR (SELECT verification_status FROM providers WHERE id=p)<>'revoked' THEN RAISE EXCEPTION 'Rejected provider still eligible'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.notifications WHERE user_id=u AND kind='verification_rejected' AND body='Rolled back rejection test') THEN RAISE EXCEPTION 'Provider decision notification missing'; END IF;
 UPDATE public.providers SET id_document_url=NULL WHERE id=p;
 BEGIN PERFORM public.admin_review_provider(p,'approved','Missing ID test'); RAISE EXCEPTION 'FAIL approval without ID'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Valid ID, selfie and business documents are required before approval' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS: completed cash read-back, $10 commission, $90 income, idempotency, dispute duplicate protection, resolution, both-party notifications, authorization, rejection and missing-document guard';
END $$;
ROLLBACK;
