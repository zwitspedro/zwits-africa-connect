ALTER TABLE public.bookings ADD COLUMN scheduled_until timestamptz;
ALTER TABLE public.deliveries ADD COLUMN scheduled_for timestamptz, ADD COLUMN scheduled_until timestamptz;
CREATE TABLE public.delivery_reassignments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),delivery_id uuid NOT NULL REFERENCES public.deliveries(id),action_key uuid NOT NULL UNIQUE,actor uuid NOT NULL,previous_driver uuid NOT NULL,replacement_driver uuid NOT NULL,reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 5 AND 1000),status text NOT NULL DEFAULT 'awaiting_replacement' CHECK(status IN ('awaiting_replacement','awaiting_handover','completed','rejected','withdrawn')),requires_handover boolean NOT NULL,handover_location text,previous_ack_at timestamptz,replacement_ack_at timestamptz,accepted_at timestamptz,handover_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),decided_at timestamptz,CHECK(previous_driver<>replacement_driver));
GRANT SELECT ON public.delivery_reassignments TO authenticated; GRANT ALL ON public.delivery_reassignments TO service_role;
ALTER TABLE public.delivery_reassignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY reassignment_read ON public.delivery_reassignments FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') OR auth.uid() IN(previous_driver,replacement_driver));
CREATE UNIQUE INDEX one_pending_delivery_replacement ON public.delivery_reassignments(delivery_id) WHERE status IN ('awaiting_replacement','awaiting_handover');
CREATE INDEX driver_pending_replacements ON public.delivery_reassignments(replacement_driver,status);
CREATE INDEX booking_schedule_commitments ON public.bookings(provider_id,scheduled_for) WHERE status IN ('pending','matching','offered','accepted','travelling','provider_arriving','arrived','in_progress');
CREATE INDEX delivery_schedule_commitments ON public.deliveries(driver_id,scheduled_for) WHERE status IN ('pending','matching','offered','accepted','arriving','picked_up');
CREATE OR REPLACE FUNCTION public.dispatch_assignment_check(_kind text,_id uuid,_assignee uuid,_start timestamptz DEFAULT NULL,_end timestamptz DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j jsonb; p jsonb; uid uuid; conflicts jsonb:='[]'; n integer; declared_start text; declared_end text; local_start timestamp; local_end timestamp;
BEGIN
 IF NOT public.is_trusted_writer() AND (auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _kind='booking' THEN SELECT to_jsonb(b) INTO j FROM public.bookings b WHERE id=_id; SELECT to_jsonb(pr),pr.user_id INTO p,uid FROM public.providers pr WHERE id=_assignee FOR UPDATE;
 ELSE SELECT to_jsonb(d) INTO j FROM public.deliveries d WHERE id=_id; SELECT to_jsonb(dr),dr.user_id INTO p,uid FROM public.driver_profiles dr WHERE user_id=_assignee FOR UPDATE; END IF;
 IF j IS NULL OR p IS NULL THEN RETURN jsonb_build_object('ok',false,'conflicts',jsonb_build_array(jsonb_build_object('reason','Job or assignee not found'))); END IF;
 _start:=coalesce(_start,(j->>'scheduled_for')::timestamptz); _end:=coalesce(_end,(j->>'scheduled_until')::timestamptz);
 IF p->>'verification_status'<>'approved' OR NOT (p->>'available')::boolean THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Assignee is not approved and online')); END IF;
 IF _end IS NOT NULL AND (_start IS NULL OR _end<=_start) THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Commitment end must be after the scheduled start')); END IF;
 IF _kind='booking' THEN
 IF NOT public.is_provider_available_at(uid,coalesce(_start,now())) OR (_end IS NOT NULL AND NOT public.is_provider_available_at(uid,_end-interval '1 second')) THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Outside declared provider availability')); END IF;
 IF p->>'category'<>j->>'category' AND NOT EXISTS(SELECT 1 FROM public.provider_services ps JOIN public.services s ON s.id=ps.service_id WHERE ps.provider_id=_assignee AND ps.active AND s.slug=j->>'category') THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Provider does not offer this service')); END IF;
 ELSE
 IF p->>'city'<>'Harare' OR p->>'id_document_url' IS NULL OR p->>'licence_url' IS NULL OR p->>'vehicle_doc_url' IS NULL OR NOT EXISTS(SELECT 1 FROM public.vehicles WHERE user_id=uid AND active AND (j->>'service_tier'='express_bike' OR vehicle_type IN ('van','truck'))) THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Driver documents, service area or vehicle are ineligible')); END IF;
 declared_start:=p->>'work_start'; declared_end:=p->>'work_end'; local_start:=coalesce(_start,now()) AT TIME ZONE 'Africa/Harare'; local_end:=coalesce(_end,_start,now()) AT TIME ZONE 'Africa/Harare';
 IF declared_start IS NOT NULL AND declared_end IS NOT NULL AND (local_start::time<declared_start::time OR local_start::time>=declared_end::time OR (_end IS NOT NULL AND (local_end::date<>local_start::date OR local_end::time>declared_end::time))) THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Outside declared driver working hours')); END IF;
 END IF;
 WITH commitments AS (
 SELECT b.id,b.scheduled_for s,b.scheduled_until e,b.status::text status FROM public.bookings b WHERE _kind='booking' AND b.id<>_id AND b.status IN ('pending','matching','offered','accepted','travelling','provider_arriving','arrived','in_progress') AND (b.provider_id=_assignee OR EXISTS(SELECT 1 FROM public.job_offers o JOIN public.admin_job_controls c ON c.kind='booking' AND c.job_id=b.id AND c.manual_dispatch WHERE o.booking_id=b.id AND o.provider_id=_assignee AND o.status='offered' AND o.expires_at>now()))
 UNION ALL SELECT d.id,d.scheduled_for,d.scheduled_until,d.status FROM public.deliveries d WHERE _kind='delivery' AND d.id<>_id AND d.status IN ('pending','matching','offered','accepted','arriving','picked_up') AND (d.driver_id=_assignee OR EXISTS(SELECT 1 FROM public.delivery_offers o JOIN public.admin_job_controls c ON c.kind='delivery' AND c.job_id=d.id AND c.manual_dispatch WHERE o.delivery_id=d.id AND o.driver_user_id=_assignee AND o.status='offered' AND o.expires_at>now()) OR EXISTS(SELECT 1 FROM public.delivery_reassignments r WHERE r.delivery_id=d.id AND r.replacement_driver=_assignee AND r.status IN ('awaiting_replacement','awaiting_handover')))
 ) SELECT count(*),coalesce(jsonb_agg(jsonb_build_object('job',id,'existingStart',s,'existingEnd',e,'proposedStart',_start,'proposedEnd',_end,'reason',CASE WHEN s IS NULL OR _start IS NULL THEN 'Active commitment has no reliable time window' WHEN e IS NULL OR _end IS NULL THEN 'Missing commitment end: overlap cannot be ruled out' ELSE 'Overlapping scheduled commitments' END)) FILTER(WHERE (_start IS NOT NULL OR s IS NOT NULL) AND (s IS NULL OR _start IS NULL OR (coalesce(_end,'infinity'::timestamptz)>s AND coalesce(e,'infinity'::timestamptz)>_start))),'[]'::jsonb) INTO n,conflicts FROM commitments;
 -- Recompute eligibility independently so commitment aggregation never masks it.
 IF p->>'verification_status'<>'approved' OR NOT (p->>'available')::boolean THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Assignee is not approved and online')); END IF;
 IF _end IS NOT NULL AND (_start IS NULL OR _end<=_start) THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Commitment end must follow start')); END IF;
 IF _kind='booking' AND (NOT public.is_provider_available_at(uid,coalesce(_start,now())) OR (_end IS NOT NULL AND NOT public.is_provider_available_at(uid,_end-interval '1 second'))) THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Outside declared provider availability')); END IF;
 IF _kind='booking' AND p->>'category'<>j->>'category' AND NOT EXISTS(SELECT 1 FROM public.provider_services ps JOIN public.services s ON s.id=ps.service_id WHERE ps.provider_id=_assignee AND ps.active AND s.slug=j->>'category') THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Provider does not offer this service')); END IF;
 IF _kind='delivery' AND (p->>'city'<>'Harare' OR p->>'id_document_url' IS NULL OR p->>'licence_url' IS NULL OR p->>'vehicle_doc_url' IS NULL OR NOT EXISTS(SELECT 1 FROM public.vehicles WHERE user_id=uid AND active AND (j->>'service_tier'='express_bike' OR vehicle_type IN ('van','truck')))) THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Driver documents, area or vehicle ineligible')); END IF;
 IF _kind='delivery' AND declared_start IS NOT NULL AND declared_end IS NOT NULL AND (local_start::time<declared_start::time OR local_start::time>=declared_end::time OR (_end IS NOT NULL AND (local_end::date<>local_start::date OR local_end::time>declared_end::time))) THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Outside declared driver working hours')); END IF;
 IF n>=3 THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Capacity exceeded: active jobs and manual offers reserve all 3 places')); END IF;
 RETURN jsonb_build_object('ok',conflicts='[]'::jsonb,'assignee',_assignee,'name',coalesce(p->>'full_name',p->>'business_name'),'load',n,'capacity',3,'conflicts',conflicts,'proposedStart',_start,'proposedEnd',_end,'limitation',CASE WHEN _start IS NULL THEN 'Unscheduled queue: capacity checked, timing and travel feasibility are not guaranteed' WHEN _end IS NULL THEN 'No reliable commitment end supplied; ambiguous scheduled conflicts are blocked' WHEN _kind='delivery' AND (declared_start IS NULL OR declared_end IS NULL) THEN 'Driver working hours are not declared; interval conflicts and capacity are enforced' ELSE NULL END);
END $$;
REVOKE ALL ON FUNCTION public.dispatch_assignment_check(text,uuid,uuid,timestamptz,timestamptz) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.dispatch_assignment_check(text,uuid,uuid,timestamptz,timestamptz) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.dispatch_commitment_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text; jid uuid; aid uuid; start_at timestamptz; end_at timestamptz; check_result jsonb;
BEGIN
 IF TG_TABLE_NAME IN ('job_offers','delivery_offers') THEN
 IF NEW.status<>'offered' THEN RETURN NEW; END IF;
 k:=CASE WHEN TG_TABLE_NAME='job_offers' THEN 'booking' ELSE 'delivery' END; jid:=(to_jsonb(NEW)->>CASE WHEN k='booking' THEN 'booking_id' ELSE 'delivery_id' END)::uuid; aid:=(to_jsonb(NEW)->>CASE WHEN k='booking' THEN 'provider_id' ELSE 'driver_user_id' END)::uuid;
 ELSE
 k:=CASE WHEN TG_TABLE_NAME='bookings' THEN 'booking' ELSE 'delivery' END; jid:=NEW.id; aid:=(to_jsonb(NEW)->>CASE WHEN k='booking' THEN 'provider_id' ELSE 'driver_id' END)::uuid;
 IF aid IS NULL OR NEW.status::text IN ('completed','delivered','cancelled','refunded','disputed','failed') THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)->>'scheduled_for') IS NOT DISTINCT FROM (to_jsonb(OLD)->>'scheduled_for') AND (to_jsonb(NEW)->>'scheduled_until') IS NOT DISTINCT FROM (to_jsonb(OLD)->>'scheduled_until') AND aid IS NOT DISTINCT FROM (to_jsonb(OLD)->>CASE WHEN k='booking' THEN 'provider_id' ELSE 'driver_id' END)::uuid THEN RETURN NEW; END IF;
 start_at:=(to_jsonb(NEW)->>'scheduled_for')::timestamptz; end_at:=(to_jsonb(NEW)->>'scheduled_until')::timestamptz;
 END IF;
 check_result:=public.dispatch_assignment_check(k,jid,aid,start_at,end_at);
 IF NOT coalesce((check_result->>'ok')::boolean,false) THEN RAISE EXCEPTION 'Scheduling conflict' USING DETAIL=check_result::text; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ab_booking_commitment BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.dispatch_commitment_guard();
CREATE TRIGGER ab_delivery_commitment BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.dispatch_commitment_guard();
CREATE TRIGGER ab_booking_offer_commitment BEFORE INSERT OR UPDATE ON public.job_offers FOR EACH ROW EXECUTE FUNCTION public.dispatch_commitment_guard();
CREATE TRIGGER ab_delivery_offer_commitment BEFORE INSERT OR UPDATE ON public.delivery_offers FOR EACH ROW EXECUTE FUNCTION public.dispatch_commitment_guard();
CREATE OR REPLACE FUNCTION public.admin_request_driver_reassignment(_id uuid,_replacement uuid,_expected timestamptz,_key uuid,_reason text,_location text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.deliveries; r public.delivery_reassignments; c jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT * INTO d FROM public.deliveries WHERE id=_id FOR UPDATE;
 SELECT * INTO r FROM public.delivery_reassignments WHERE action_key=_key;
 IF FOUND THEN IF r.actor<>auth.uid() OR r.delivery_id<>_id OR r.replacement_driver<>_replacement THEN RAISE EXCEPTION 'Action key already used'; END IF; RETURN jsonb_build_object('ok',true,'id',r.id,'idempotent',true); END IF;
 IF d.id IS NULL OR d.driver_id IS NULL OR d.status NOT IN ('accepted','arriving','picked_up') OR d.payment_status='paid' OR EXISTS(SELECT 1 FROM public.wallet_transactions WHERE delivery_id=_id) THEN RAISE EXCEPTION 'Only assigned unsettled active deliveries can be replaced'; END IF;
 IF d.updated_at IS DISTINCT FROM _expected THEN RAISE EXCEPTION 'Job changed; refresh before continuing'; END IF;
 IF public.dispatch_job_blocked('delivery',_id) THEN RAISE EXCEPTION 'Resolve holds and changes first'; END IF;
 IF length(trim(coalesce(_reason,''))) NOT BETWEEN 5 AND 1000 OR _replacement=d.driver_id THEN RAISE EXCEPTION 'Replacement driver and reason required'; END IF;
 IF d.status='picked_up' AND length(trim(coalesce(_location,'')))<3 THEN RAISE EXCEPTION 'Record the parcel handover location'; END IF;
 c:=public.dispatch_assignment_check('delivery',_id,_replacement);
 IF NOT (c->>'ok')::boolean THEN RETURN c; END IF;
 INSERT INTO public.delivery_reassignments(delivery_id,action_key,actor,previous_driver,replacement_driver,reason,requires_handover,handover_location) VALUES(_id,_key,auth.uid(),d.driver_id,_replacement,trim(_reason),d.status='picked_up',_location) RETURNING * INTO r;
 INSERT INTO public.admin_job_actions(action_key,kind,job_id,actor,action,reason,before_values,after_values) VALUES(_key,'delivery',_id,auth.uid(),'reassignment_requested',_reason,jsonb_build_object('driver',d.driver_id,'status',d.status),jsonb_build_object('replacement',_replacement,'request',r.id,'requires_handover',r.requires_handover));
 PERFORM public.log_admin_action('reassignment_requested','delivery',_id,to_jsonb(r));
 INSERT INTO public.notifications(user_id,title,body,link,kind) SELECT u,'Driver replacement requested',_reason,CASE WHEN u=d.customer_id THEN '/deliveries/'||_id::text ELSE '/driver' END,'driver_reassignment' FROM unnest(ARRAY[d.driver_id,_replacement,d.customer_id]) u;
 RETURN jsonb_build_object('ok',true,'id',r.id);
END $$;
CREATE OR REPLACE FUNCTION public.respond_driver_reassignment(_id uuid,_decision text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.delivery_reassignments; d public.deliveries; jid uuid; c jsonb;
BEGIN
 SELECT delivery_id INTO jid FROM public.delivery_reassignments WHERE id=_id;
 SELECT * INTO d FROM public.deliveries WHERE id=jid FOR UPDATE;
 SELECT * INTO r FROM public.delivery_reassignments WHERE id=_id FOR UPDATE;
 IF auth.uid() IS NULL OR r.id IS NULL OR auth.uid() NOT IN(r.previous_driver,r.replacement_driver) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF r.status='completed' THEN RETURN jsonb_build_object('ok',true,'idempotent',true); END IF;
 IF r.status NOT IN ('awaiting_replacement','awaiting_handover') OR d.driver_id IS DISTINCT FROM r.previous_driver OR d.status NOT IN ('accepted','arriving','picked_up') THEN RAISE EXCEPTION 'Replacement is no longer pending'; END IF;
 IF _decision='reject' AND auth.uid()=r.replacement_driver THEN UPDATE public.delivery_reassignments SET status='rejected',decided_at=now() WHERE id=_id;
 ELSIF _decision='accept' AND auth.uid()=r.replacement_driver AND r.status='awaiting_replacement' THEN
 c:=public.dispatch_assignment_check('delivery',jid,r.replacement_driver); IF NOT (c->>'ok')::boolean THEN RETURN c; END IF;
 UPDATE public.delivery_reassignments SET accepted_at=now(),status=CASE WHEN requires_handover THEN 'awaiting_handover' ELSE status END WHERE id=_id RETURNING * INTO r;
 ELSIF _decision='handover' AND r.status='awaiting_handover' THEN
 UPDATE public.delivery_reassignments SET previous_ack_at=CASE WHEN auth.uid()=previous_driver THEN coalesce(previous_ack_at,now()) ELSE previous_ack_at END,replacement_ack_at=CASE WHEN auth.uid()=replacement_driver THEN coalesce(replacement_ack_at,now()) ELSE replacement_ack_at END WHERE id=_id RETURNING * INTO r;
 ELSE RAISE EXCEPTION 'This decision is not available to you'; END IF;
 IF (_decision='accept' AND NOT r.requires_handover) OR (_decision='handover' AND r.previous_ack_at IS NOT NULL AND r.replacement_ack_at IS NOT NULL) THEN
 c:=public.dispatch_assignment_check('delivery',jid,r.replacement_driver); IF NOT (c->>'ok')::boolean THEN RAISE EXCEPTION 'Replacement eligibility changed' USING DETAIL=c::text; END IF;
 PERFORM set_config('zwits.trusted','on',true); PERFORM set_config('zwits.custody_transfer',r.id::text,true);
 UPDATE public.deliveries SET driver_id=r.replacement_driver WHERE id=jid;
 UPDATE public.delivery_reassignments SET status='completed',decided_at=now(),handover_at=CASE WHEN requires_handover THEN now() ELSE NULL END WHERE id=_id;
 UPDATE public.delivery_offers SET status='lost',responded_at=now() WHERE delivery_id=jid AND status IN ('accepted','offered');
 PERFORM public.log_delivery_event(jid,'driver_reassigned',auth.uid(),jsonb_build_object('request',r.id,'previous',r.previous_driver,'replacement',r.replacement_driver,'admin',r.actor,'reason',r.reason,'handover',r.requires_handover),NULL);
 END IF;
 INSERT INTO public.admin_audit_log(actor,action,subject_type,subject_id,metadata) VALUES(auth.uid(),'reassignment_'||_decision,'delivery',jid,jsonb_build_object('request',r.id,'admin_authorisation',r.actor,'previous',r.previous_driver,'replacement',r.replacement_driver));
 INSERT INTO public.notifications(user_id,title,body,link,kind) SELECT u,'Driver replacement updated',_decision,CASE WHEN u=d.customer_id THEN '/deliveries/'||jid::text WHEN u=r.actor THEN '/admin/deliveries/'||jid::text ELSE '/driver' END,'driver_reassignment' FROM unnest(ARRAY[r.previous_driver,r.replacement_driver,d.customer_id,r.actor]) u;
 RETURN jsonb_build_object('ok',true,'status',(SELECT status FROM public.delivery_reassignments WHERE id=_id));
END $$;
CREATE OR REPLACE FUNCTION public.admin_withdraw_driver_reassignment(_id uuid,_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE jid uuid; r public.delivery_reassignments;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF length(trim(coalesce(_reason,''))) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Reason required'; END IF;
 SELECT delivery_id INTO jid FROM public.delivery_reassignments WHERE id=_id; PERFORM 1 FROM public.deliveries WHERE id=jid FOR UPDATE;
 SELECT * INTO r FROM public.delivery_reassignments WHERE id=_id FOR UPDATE;
 IF r.status NOT IN ('awaiting_replacement','awaiting_handover') THEN RAISE EXCEPTION 'No pending replacement'; END IF;
 UPDATE public.delivery_reassignments SET status='withdrawn',decided_at=now() WHERE id=_id;
 PERFORM public.log_admin_action('reassignment_withdrawn','delivery',jid,jsonb_build_object('request',_id,'reason',_reason));
 INSERT INTO public.notifications(user_id,title,body,link,kind) SELECT u,'Driver replacement withdrawn',_reason,'/driver','driver_reassignment' FROM unnest(ARRAY[r.previous_driver,r.replacement_driver]) u;
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.admin_request_driver_reassignment(uuid,uuid,timestamptz,uuid,text,text),public.respond_driver_reassignment(uuid,text),public.admin_withdraw_driver_reassignment(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_request_driver_reassignment(uuid,uuid,timestamptz,uuid,text,text),public.respond_driver_reassignment(uuid,text),public.admin_withdraw_driver_reassignment(uuid,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.delivery_custody_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.delivery_reassignments WHERE delivery_id=NEW.id AND status IN ('awaiting_replacement','awaiting_handover')) AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.driver_id IS DISTINCT FROM OLD.driver_id) AND coalesce(current_setting('zwits.custody_transfer',true),'')='' THEN RAISE EXCEPTION 'Resolve the pending driver replacement and custody handover first'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ab_delivery_custody BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.delivery_custody_guard();