-- Run with a privileged test connection. All fixture changes roll back.
BEGIN;
DO $$
DECLARE actor uuid; customer uuid; bid uuid; ver timestamptz; result jsonb; action_id uuid:=gen_random_uuid();
BEGIN
 SELECT user_id INTO actor FROM public.user_roles WHERE role='admin' LIMIT 1;
 SELECT user_id INTO customer FROM public.profiles LIMIT 1;
 IF actor IS NULL OR customer IS NULL THEN RAISE EXCEPTION 'Test needs admin and customer fixtures'; END IF;
 PERFORM set_config('zwits.trusted','on',true);
 INSERT INTO public.bookings(customer_id,category,address,price,payment_method,scheduled_for) VALUES(customer,'cleaning','DISPATCH V3 ROLLBACK FIXTURE',25,'cash',now()+interval '1 day') RETURNING id,updated_at INTO bid,ver;
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 PERFORM public.admin_dispatch_priority('booking',bid,ver,action_id,'urgent','Rollback priority test');
 IF (SELECT priority FROM public.admin_job_controls WHERE kind='booking' AND job_id=bid)<>'urgent' THEN RAISE EXCEPTION 'FAIL urgent priority'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.admin_job_actions WHERE job_id=bid AND actor=auth.uid() AND after_values->>'priority'='urgent') THEN RAISE EXCEPTION 'FAIL audit'; END IF;
 result:=public.admin_dispatch_priority('booking',bid,ver,action_id,'urgent','Rollback priority test');
 IF result->>'idempotent'<>'true' THEN RAISE EXCEPTION 'FAIL priority replay'; END IF;
 BEGIN PERFORM public.admin_dispatch_priority('booking',bid,ver,gen_random_uuid(),'low','Rollback stale test');RAISE EXCEPTION 'FAIL stale allowed'; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'This job changed%' THEN RAISE; END IF; END;
 result:=public.admin_dispatch_directory(jsonb_build_object('term','DISPATCH V3 ROLLBACK FIXTURE','priority','urgent','view','scheduled'));
 IF (result->>'total')::integer<>1 OR (result->'metrics'->>'scheduled')::integer<>1 THEN RAISE EXCEPTION 'FAIL queue aggregate'; END IF;
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN PERFORM public.admin_dispatch_directory('{}');RAISE EXCEPTION 'FAIL anonymous access'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Forbidden' THEN RAISE; END IF; END;
 IF EXISTS(SELECT 1 FROM public.wallet_transactions WHERE booking_id=bid) THEN RAISE EXCEPTION 'FAIL changed finances'; END IF;
 RAISE NOTICE 'PASS dispatch v3: priority, audit, replay, stale version, schedule totals, anonymous access, unchanged ledger';
END $$;
ROLLBACK;