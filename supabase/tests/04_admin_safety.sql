-- Read-only regression assertions. Execute in a controlled test environment.
-- Does not mutate customer, provider, payment or wallet records.
BEGIN;
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
  BEGIN
    PERFORM public.admin_period_metrics('2026-10-01','2026-10-02');
    RAISE EXCEPTION 'FAIL: anonymous metrics allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Forbidden' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.admin_decide_withdrawal('00000000-0000-4000-8000-000000000000','paid','test');
    RAISE EXCEPTION 'FAIL: anonymous payout allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'Forbidden' THEN RAISE; END IF;
  END;
END $$;
ROLLBACK;
