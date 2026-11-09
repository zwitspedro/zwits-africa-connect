CREATE OR REPLACE FUNCTION public.dispatch_control_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text; jid uuid; j jsonb; manual boolean; newj jsonb:=to_jsonb(NEW); oldj jsonb;
BEGIN
 IF TG_OP='UPDATE' THEN oldj:=to_jsonb(OLD); END IF;
 k:=CASE WHEN TG_TABLE_NAME IN ('bookings','job_offers') THEN 'booking' ELSE 'delivery' END;
 IF TG_TABLE_NAME IN ('job_offers','delivery_offers') THEN
  jid:=(newj->>CASE WHEN k='booking' THEN 'booking_id' ELSE 'delivery_id' END)::uuid;
  IF k='booking' THEN SELECT to_jsonb(b) INTO j FROM public.bookings b WHERE id=jid FOR UPDATE; ELSE SELECT to_jsonb(d) INTO j FROM public.deliveries d WHERE id=jid FOR UPDATE; END IF;
  IF newj->>'status'='offered' AND (TG_OP='INSERT' OR oldj->>'status' IS DISTINCT FROM newj->>'status') THEN
   SELECT manual_dispatch INTO manual FROM public.admin_job_controls WHERE kind=k AND job_id=jid;
   IF public.dispatch_job_blocked(k,jid) OR j->>'status' NOT IN ('pending','matching','offered') OR coalesce(j->>'provider_id',j->>'driver_id') IS NOT NULL OR (coalesce(manual,false) AND coalesce(current_setting('zwits.dispatch_control',true),'')<>'on') THEN RAISE EXCEPTION 'Dispatch is paused or already assigned'; END IF;
  END IF;
 ELSE
  jid:=NEW.id;
  IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('cancelled','disputed') AND public.dispatch_job_blocked(k,jid) AND coalesce(current_setting('zwits.dispatch_control',true),'')<>'on' THEN RAISE EXCEPTION 'Job is on hold or awaiting approval'; END IF;
 END IF;
 RETURN NEW;
END $$;