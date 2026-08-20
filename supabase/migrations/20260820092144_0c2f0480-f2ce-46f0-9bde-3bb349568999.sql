DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['postgres','sandbox_exec'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.accept_job_offer(uuid, uuid) TO %I', r);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.cancel_booking_as(uuid, uuid, text) TO %I', r);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.settle_delivery(uuid) TO %I', r);
    END IF;
  END LOOP;
END $$;