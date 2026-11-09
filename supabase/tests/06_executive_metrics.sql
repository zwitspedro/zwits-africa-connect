-- Read-only assertions against real aggregates. No business rows are changed.
BEGIN;
SET LOCAL ROLE authenticated;
DO $$
DECLARE actor uuid; m jsonb; expected bigint; total numeric;
BEGIN
 SELECT user_id INTO actor FROM public.user_roles WHERE role='admin' LIMIT 1;
 IF actor IS NULL THEN RAISE EXCEPTION 'Test requires an existing administrator'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 m:=public.admin_period_metrics('2026-10-10T22:00:00Z','2026-11-09T22:00:00Z');
 SELECT count(*) INTO expected FROM public.user_roles WHERE role='customer';
 IF (m->>'totalCustomers')::bigint<>expected THEN RAISE EXCEPTION 'Total customer mismatch'; END IF;
 SELECT count(*) INTO expected FROM public.bookings WHERE status IN ('matching','offered','pending','accepted','travelling','provider_arriving','arrived','in_progress');
 IF (m->>'activeJobs')::bigint<>expected THEN RAISE EXCEPTION 'Active booking mismatch'; END IF;
 IF jsonb_array_length(m->'daily')<>30 THEN RAISE EXCEPTION 'Expected 30 Harare daily buckets'; END IF;
 SELECT sum((v->>'revenue')::numeric) INTO total FROM jsonb_array_elements(m->'daily') v;
 IF total<>(m->>'revenue')::numeric THEN RAISE EXCEPTION 'Daily payments do not reconcile'; END IF;
 SELECT sum((v->>'commission')::numeric) INTO total FROM jsonb_array_elements(m->'daily') v;
 IF total<>(m->>'commission')::numeric THEN RAISE EXCEPTION 'Daily commission does not reconcile'; END IF;
 BEGIN
  PERFORM public.admin_period_metrics('2026-11-09','2026-11-01');
  RAISE EXCEPTION 'Invalid range accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'Select a date range of at most one year' THEN RAISE; END IF;
 END;
END $$;
ROLLBACK;