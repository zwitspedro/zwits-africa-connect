-- Run through a privileged test connection; every fixture change rolls back.
BEGIN;
DO $$
DECLARE bid uuid; uid uuid := 'b5fe6a6e-b70b-4abd-9407-b3606198d13c'; pid uuid; r jsonb;
BEGIN
 SELECT id INTO pid FROM public.providers WHERE user_id=uid;
 IF pid IS NULL THEN RAISE EXCEPTION 'Dummy provider fixture required'; END IF;
 PERFORM set_config('request.jwt.claim.sub','88942034-e764-4d39-9e26-ab02856bed40',true);
 INSERT INTO public.bookings(customer_id,provider_id,category,address,description,fulfilment_mode,payment_method,price)
 VALUES('88942034-e764-4d39-9e26-ab02856bed40',pid,'cleaning','DUMMY REGRESSION ONLY','DUMMY ROLLED BACK ACCEPTANCE TEST','direct','cash',25) RETURNING id INTO bid;
 PERFORM set_config('request.jwt.claim.sub','88942034-e764-4d39-9e26-ab02856bed40',true);
 BEGIN
  PERFORM public.accept_direct_booking(bid);
  RAISE EXCEPTION 'FAIL customer accepted provider job';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'Only the assigned provider can accept this direct booking' THEN RAISE; END IF;
 END;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 r:=public.accept_direct_booking(bid);
 IF r->>'ok'<>'true' OR (SELECT status FROM public.bookings WHERE id=bid)<>'accepted' THEN RAISE EXCEPTION 'FAIL provider acceptance'; END IF;
 r:=public.accept_direct_booking(bid);
 IF r->>'idempotent'<>'true' THEN RAISE EXCEPTION 'FAIL acceptance replay'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.booking_status_history WHERE booking_id=bid AND status='accepted') THEN RAISE EXCEPTION 'FAIL acceptance history'; END IF;
END $$;
ROLLBACK;