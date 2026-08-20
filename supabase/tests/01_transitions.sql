-- Booking / delivery state-machine rules. Pure function assertions, no writes.
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  ok boolean;
  valid text[][] := ARRAY[
    ARRAY['pending','matching'], ARRAY['requested','matching'],
    ARRAY['matching','offered'], ARRAY['offered','accepted'],
    ARRAY['offered','cancelled'], ARRAY['accepted','provider_arriving'],
    ARRAY['accepted','travelling'], ARRAY['provider_arriving','arrived'],
    ARRAY['arrived','in_progress'], ARRAY['in_progress','completed'],
    ARRAY['completed','disputed'], ARRAY['disputed','refunded']
  ];
  invalid text[][] := ARRAY[
    ARRAY['requested','completed'], ARRAY['pending','completed'],
    ARRAY['offered','completed'], ARRAY['cancelled','accepted'],
    ARRAY['refunded','completed'], ARRAY['completed','in_progress'],
    ARRAY['accepted','completed'], ARRAY['arrived','completed'],
    ARRAY['cancelled','pending'], ARRAY['refunded','disputed']
  ];
  pair text[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY valid LOOP
    ok := public.booking_transition_allowed(pair[1], pair[2]);
    IF NOT ok THEN RAISE EXCEPTION 'FAIL: % -> % should be allowed', pair[1], pair[2]; END IF;
  END LOOP;

  FOREACH pair SLICE 1 IN ARRAY invalid LOOP
    ok := public.booking_transition_allowed(pair[1], pair[2]);
    IF ok THEN RAISE EXCEPTION 'FAIL: % -> % should be rejected', pair[1], pair[2]; END IF;
  END LOOP;

  IF NOT public.delivery_transition_allowed('picked_up','delivered') THEN
    RAISE EXCEPTION 'FAIL: delivery picked_up -> delivered should be allowed';
  END IF;
  IF public.delivery_transition_allowed('pending','delivered') THEN
    RAISE EXCEPTION 'FAIL: delivery pending -> delivered should be rejected';
  END IF;
  IF public.delivery_transition_allowed('cancelled','accepted') THEN
    RAISE EXCEPTION 'FAIL: delivery cancelled -> accepted should be rejected';
  END IF;

  RAISE NOTICE 'PASS 01_transitions: % valid, % invalid transitions', array_length(valid,1), array_length(invalid,1);
END $$;

ROLLBACK;
