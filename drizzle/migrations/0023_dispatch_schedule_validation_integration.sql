DO $$ DECLARE s text; BEGIN
s:=pg_get_functiondef('public.admin_dispatch_action(text,uuid,timestamptz,uuid,text,text,uuid,jsonb)'::regprocedure);
s:=replace(s,'''description'',''scheduled_for'',''price''','''description'',''scheduled_for'',''scheduled_until'',''price''');
s:=replace(s,'''description'',''scheduled_for'',''price''','''description'',''scheduled_for'',''scheduled_until'',''price''');
s:=replace(s,'''address'',''lat'',''lng'',''description'',''scheduled_for'',''price''','''address'',''lat'',''lng'',''description'',''scheduled_for'',''scheduled_until'',''price''');
s:=replace(s,'''recipient_name'',''recipient_phone'',''notes'',''parcel_size''','''recipient_name'',''recipient_phone'',''notes'',''scheduled_for'',''scheduled_until'',''parcel_size''');
EXECUTE s;
s:=pg_get_functiondef('public.validate_admin_change_record()'::regprocedure);
s:=replace(s,'''description'',''scheduled_for'',''price''','''description'',''scheduled_for'',''scheduled_until'',''price''');
s:=replace(s,'''recipient_name'',''recipient_phone'',''notes'',''parcel_size''','''recipient_name'',''recipient_phone'',''notes'',''scheduled_for'',''scheduled_until'',''parcel_size''');
s:=replace(s,'v:=j||NEW.proposed_values;', 'v:=j||NEW.proposed_values; IF v->>''scheduled_until'' IS NOT NULL AND (v->>''scheduled_for'' IS NULL OR (v->>''scheduled_until'')::timestamptz <= (v->>''scheduled_for'')::timestamptz) THEN RAISE EXCEPTION ''Commitment end must follow start''; END IF; IF current_assignee IS NOT NULL AND NEW.proposed_values ?| ARRAY[''scheduled_for'',''scheduled_until''] THEN IF NOT (public.dispatch_assignment_check(NEW.kind,NEW.job_id,CASE WHEN NEW.kind=''booking'' THEN (j->>''provider_id'')::uuid ELSE current_assignee END,(v->>''scheduled_for'')::timestamptz,(v->>''scheduled_until'')::timestamptz)->>''ok'')::boolean THEN RAISE EXCEPTION ''Scheduling conflict: inspect assignee commitments before proposing''; END IF; END IF;');
EXECUTE s;
s:=pg_get_functiondef('public.respond_driver_reassignment(uuid,text)'::regprocedure);
s:=replace(s,'IF r.status=''completed'' THEN','PERFORM set_config(''zwits.trusted'',''on'',true); IF r.status=''completed'' THEN'); EXECUTE s;
END $$;
CREATE OR REPLACE FUNCTION public.dispatch_schedule_shape_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.scheduled_until IS NOT NULL AND (NEW.scheduled_for IS NULL OR NEW.scheduled_until<=NEW.scheduled_for) THEN RAISE EXCEPTION 'Commitment end must follow scheduled start'; END IF; RETURN NEW; END $$;
CREATE TRIGGER ac_booking_schedule_shape BEFORE INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.dispatch_schedule_shape_guard();
CREATE TRIGGER ac_delivery_schedule_shape BEFORE INSERT OR UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.dispatch_schedule_shape_guard();
CREATE OR REPLACE FUNCTION public.admin_bulk_assign(_jobs jsonb,_reason text,_preview boolean DEFAULT true) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item jsonb; j jsonb; tbl text; check_result jsonb; results jsonb:='[]'; response jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF jsonb_typeof(_jobs)<>'array' OR jsonb_array_length(_jobs) NOT BETWEEN 1 AND 25 OR length(trim(coalesce(_reason,''))) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Select 1 to 25 jobs and enter a reason'; END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(_jobs))<>(SELECT count(DISTINCT(value->>'kind')||':'||(value->>'id')) FROM jsonb_array_elements(_jobs)) THEN RAISE EXCEPTION 'Duplicate jobs'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(_jobs) ORDER BY value->>'assignee',value->>'id' LOOP
 BEGIN
 IF item->>'kind' NOT IN ('booking','delivery') THEN RAISE EXCEPTION 'Invalid job type'; END IF;
 tbl:=CASE WHEN item->>'kind'='booking' THEN 'bookings' ELSE 'deliveries' END;
 EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 FOR UPDATE',tbl) INTO j USING (item->>'id')::uuid;
 IF NOT _preview AND EXISTS(SELECT 1 FROM public.admin_job_actions WHERE action_key=(item->>'key')::uuid AND actor=auth.uid() AND kind=item->>'kind' AND job_id=(item->>'id')::uuid AND action='assign') THEN results:=results||jsonb_build_array(jsonb_build_object('id',item->>'id','ok',true,'idempotent',true)); CONTINUE; END IF;
 IF j IS NULL OR j->>'status' NOT IN ('pending','matching','offered') OR coalesce(j->>'provider_id',j->>'driver_id') IS NOT NULL OR EXISTS(SELECT 1 FROM public.job_offers WHERE booking_id=(item->>'id')::uuid AND status='offered' AND expires_at>now()) OR EXISTS(SELECT 1 FROM public.delivery_offers WHERE delivery_id=(item->>'id')::uuid AND status='offered' AND expires_at>now()) THEN RAISE EXCEPTION 'Job is assigned or already has an active offer'; END IF;
 IF (j->>'updated_at')::timestamptz IS DISTINCT FROM (item->>'expected')::timestamptz THEN RAISE EXCEPTION 'Job changed; refresh before retrying'; END IF;
 check_result:=public.dispatch_assignment_check(item->>'kind',(item->>'id')::uuid,(item->>'assignee')::uuid);
 IF NOT (check_result->>'ok')::boolean THEN results:=results||jsonb_build_array(check_result||jsonb_build_object('id',item->>'id')); CONTINUE; END IF;
 IF NOT _preview THEN response:=public.admin_dispatch_action(item->>'kind',(item->>'id')::uuid,(item->>'expected')::timestamptz,(item->>'key')::uuid,'assign',_reason,(item->>'assignee')::uuid); END IF;
 results:=results||jsonb_build_array(check_result||jsonb_build_object('id',item->>'id','ok',true,'offered',NOT _preview));
 EXCEPTION WHEN OTHERS THEN results:=results||jsonb_build_array(jsonb_build_object('id',item->>'id','ok',false,'error',SQLERRM,'details',SQLSTATE)); END;
 END LOOP;
 RETURN jsonb_build_object('results',results,'preview',_preview);
END $$;
REVOKE ALL ON FUNCTION public.admin_bulk_assign(jsonb,text,boolean) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.admin_bulk_assign(jsonb,text,boolean) TO authenticated,service_role;