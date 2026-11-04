-- Cash jobs must use the published 10% commission even without a category row.
BEGIN;
DO $$
BEGIN
  IF public.calc_commission('plumbing', 100) IS DISTINCT FROM 10::numeric THEN
    RAISE EXCEPTION 'A $100 plumbing job must charge $10 commission';
  END IF;
  IF public.calc_commission('unmapped_cash_test_category', 100) IS DISTINCT FROM 10::numeric THEN
    RAISE EXCEPTION 'An unmapped $100 cash job must charge $10 commission';
  END IF;
END $$;
ROLLBACK;