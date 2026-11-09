CREATE TABLE public.admin_job_controls (kind text NOT NULL CHECK(kind IN ('booking','delivery')), job_id uuid NOT NULL, held boolean NOT NULL DEFAULT false, hold_reason text, manual_dispatch boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(kind,job_id));
GRANT SELECT ON public.admin_job_controls TO authenticated;
GRANT ALL ON public.admin_job_controls TO service_role;
ALTER TABLE public.admin_job_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_control_read ON public.admin_job_controls FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.admin_job_changes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK(kind IN ('booking','delivery')), job_id uuid NOT NULL, actor uuid NOT NULL, customer_id uuid NOT NULL, assignee_user_id uuid, reason text NOT NULL, before_values jsonb NOT NULL, proposed_values jsonb NOT NULL, expected_updated_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'pending_customer' CHECK(status IN ('pending_customer','pending_assignee','applied','rejected','withdrawn')), customer_decided_at timestamptz, assignee_decided_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.admin_job_changes TO authenticated;
GRANT ALL ON public.admin_job_changes TO service_role;
ALTER TABLE public.admin_job_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY change_participants_read ON public.admin_job_changes FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin') OR customer_id=auth.uid() OR assignee_user_id=auth.uid());
CREATE UNIQUE INDEX admin_job_one_pending_change ON public.admin_job_changes(kind,job_id) WHERE status IN ('pending_customer','pending_assignee');
CREATE TABLE public.admin_job_actions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action_key uuid NOT NULL UNIQUE, kind text NOT NULL CHECK(kind IN ('booking','delivery')), job_id uuid NOT NULL, actor uuid NOT NULL, action text NOT NULL, reason text NOT NULL, before_values jsonb NOT NULL, after_values jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.admin_job_actions TO authenticated;
GRANT ALL ON public.admin_job_actions TO service_role;
ALTER TABLE public.admin_job_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY action_admin_read ON public.admin_job_actions FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE INDEX admin_job_actions_lookup ON public.admin_job_actions(kind,job_id,created_at DESC);
CREATE OR REPLACE FUNCTION public.dispatch_job_blocked(_kind text,_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.admin_job_controls WHERE kind=_kind AND job_id=_id AND held) OR EXISTS(SELECT 1 FROM public.admin_job_changes WHERE kind=_kind AND job_id=_id AND status IN ('pending_customer','pending_assignee')) $$;
REVOKE ALL ON FUNCTION public.dispatch_job_blocked(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dispatch_job_blocked(text,uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.dispatch_control_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text; jid uuid; j jsonb; manual boolean;
BEGIN
 k:=CASE WHEN TG_TABLE_NAME IN ('bookings','job_offers') THEN 'booking' ELSE 'delivery' END;
 IF TG_TABLE_NAME IN ('job_offers','delivery_offers') THEN
  jid:=CASE WHEN k='booking' THEN NEW.booking_id ELSE NEW.delivery_id END;
  IF k='booking' THEN SELECT to_jsonb(b) INTO j FROM public.bookings b WHERE id=jid FOR UPDATE; ELSE SELECT to_jsonb(d) INTO j FROM public.deliveries d WHERE id=jid FOR UPDATE; END IF;
  IF NEW.status='offered' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
   SELECT manual_dispatch INTO manual FROM public.admin_job_controls WHERE kind=k AND job_id=jid;
   IF public.dispatch_job_blocked(k,jid) OR j->>'status' NOT IN ('pending','matching','offered') OR coalesce(j->>'provider_id',j->>'driver_id') IS NOT NULL OR (coalesce(manual,false) AND coalesce(current_setting('zwits.dispatch_control',true),'')<>'on') THEN RAISE EXCEPTION 'Dispatch is paused or already assigned'; END IF;
  END IF;
 ELSE
  jid:=NEW.id;
  IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('cancelled','disputed') AND public.dispatch_job_blocked(k,jid) AND coalesce(current_setting('zwits.dispatch_control',true),'')<>'on' THEN RAISE EXCEPTION 'Job is on hold or awaiting approval'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER aa_dispatch_booking_guard BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.dispatch_control_guard();
CREATE TRIGGER aa_dispatch_delivery_guard BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.dispatch_control_guard();
CREATE TRIGGER aa_dispatch_booking_offer_guard BEFORE INSERT OR UPDATE ON public.job_offers FOR EACH ROW EXECUTE FUNCTION public.dispatch_control_guard();
CREATE TRIGGER aa_dispatch_delivery_offer_guard BEFORE INSERT OR UPDATE ON public.delivery_offers FOR EACH ROW EXECUTE FUNCTION public.dispatch_control_guard();
CREATE OR REPLACE FUNCTION public.admin_dispatch_action(_kind text,_id uuid,_expected timestamptz,_key uuid,_action text,_reason text,_assignee uuid DEFAULT NULL,_patch jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j jsonb; after_j jsonb; tbl text; old_user uuid; customer uuid; p public.providers; d public.driver_profiles; offer uuid; fields text[]; f text; change_id uuid; previous_actor uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF length(trim(_reason))<5 OR length(_reason)>1000 OR _kind NOT IN ('booking','delivery') THEN RAISE EXCEPTION 'A valid reason and job type are required'; END IF;
 tbl:=CASE WHEN _kind='booking' THEN 'bookings' ELSE 'deliveries' END;
 EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 FOR UPDATE',tbl) INTO j USING _id;
 IF j IS NULL THEN RAISE EXCEPTION 'Job not found'; END IF;
 SELECT actor INTO previous_actor FROM public.admin_job_actions WHERE action_key=_key;
 IF FOUND THEN IF previous_actor<>auth.uid() OR NOT EXISTS(SELECT 1 FROM public.admin_job_actions WHERE action_key=_key AND kind=_kind AND job_id=_id AND action=_action) THEN RAISE EXCEPTION 'Action key already used'; END IF; RETURN jsonb_build_object('ok',true,'idempotent',true); END IF;
 IF (j->>'updated_at')::timestamptz IS DISTINCT FROM _expected THEN RAISE EXCEPTION 'This job changed. Refresh before continuing.'; END IF;
 customer:=(j->>'customer_id')::uuid;
 IF _kind='booking' THEN SELECT user_id INTO old_user FROM public.providers WHERE id=(j->>'provider_id')::uuid; ELSE old_user:=(j->>'driver_id')::uuid; END IF;
 PERFORM set_config('zwits.trusted','on',true); PERFORM set_config('zwits.dispatch_control','on',true);
 IF _action='note' THEN NULL;
 ELSIF _action='hold' THEN
  IF j->>'status' IN ('completed','delivered','cancelled','refunded') THEN RAISE EXCEPTION 'Terminal jobs cannot be held'; END IF;
  INSERT INTO public.admin_job_controls(kind,job_id,held,hold_reason) VALUES(_kind,_id,true,_reason) ON CONFLICT(kind,job_id) DO UPDATE SET held=true,hold_reason=_reason,updated_at=now();
 ELSIF _action='release' THEN
  IF EXISTS(SELECT 1 FROM public.admin_job_changes WHERE kind=_kind AND job_id=_id AND status IN ('pending_customer','pending_assignee')) THEN RAISE EXCEPTION 'Resolve the pending change first'; END IF;
  UPDATE public.admin_job_controls SET held=false,hold_reason=NULL,updated_at=now() WHERE kind=_kind AND job_id=_id;
 ELSIF _action IN ('assign','unassign') THEN
  IF public.dispatch_job_blocked(_kind,_id) THEN RAISE EXCEPTION 'Release holds and resolve approvals before assignment'; END IF;
  IF j->>'status' NOT IN ('pending','matching','offered') THEN RAISE EXCEPTION 'Accepted or collected jobs require a controlled cancellation; reassignment is only available before acceptance'; END IF;
  IF j->>'payment_status'='paid' OR EXISTS(SELECT 1 FROM public.wallet_transactions WHERE booking_id=_id OR delivery_id=_id) THEN RAISE EXCEPTION 'Financially reconciled jobs cannot be reassigned'; END IF;
  INSERT INTO public.admin_job_controls(kind,job_id,manual_dispatch) VALUES(_kind,_id,_action='assign') ON CONFLICT(kind,job_id) DO UPDATE SET manual_dispatch=excluded.manual_dispatch,updated_at=now();
  IF _kind='booking' THEN
   UPDATE public.job_offers SET status='lost',responded_at=now() WHERE booking_id=_id AND status IN ('offered','accepted','quoted','expired');
   UPDATE public.job_quotes SET status='rejected' WHERE booking_id=_id AND status='submitted';
   UPDATE public.bookings SET provider_id=NULL,status='pending',fulfilment_mode='instant',dispatch_state=CASE WHEN _action='assign' THEN 'dispatching' ELSE 'no_providers' END,dispatch_wave=0 WHERE id=_id;
   IF _action='assign' THEN
    SELECT * INTO p FROM public.providers WHERE id=_assignee FOR UPDATE;
    IF NOT FOUND OR p.verification_status<>'approved' OR NOT p.available OR NOT coalesce((public.provider_readiness(p.user_id)->>'documents_complete')::boolean,false) OR NOT public.is_provider_available_at(p.user_id,coalesce((j->>'scheduled_for')::timestamptz,now())) THEN RAISE EXCEPTION 'Provider must be verified, online, document-ready and available'; END IF;
    IF p.category<>j->>'category' AND NOT EXISTS(SELECT 1 FROM public.provider_services ps JOIN public.services s ON s.id=ps.service_id WHERE ps.provider_id=p.id AND ps.active AND s.slug=j->>'category') THEN RAISE EXCEPTION 'Provider does not offer this service'; END IF;
    IF (SELECT count(*) FROM public.bookings WHERE provider_id=p.id AND status IN ('accepted','travelling','provider_arriving','arrived','in_progress'))>=3 THEN RAISE EXCEPTION 'Provider has no capacity'; END IF;
    INSERT INTO public.job_offers(booking_id,provider_id,provider_user_id,wave,status,expires_at) VALUES(_id,p.id,p.user_id,1,'offered',now()+interval '5 minutes') ON CONFLICT(booking_id,provider_id) DO UPDATE SET status='offered',expires_at=excluded.expires_at,offered_at=now(),responded_at=NULL RETURNING id INTO offer;
    INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(p.user_id,'Admin assigned a job offer','Review and accept the offer before starting.','/provider/dashboard','job_offer');
   END IF;
  ELSE
   UPDATE public.delivery_offers SET status='lost',responded_at=now() WHERE delivery_id=_id AND status IN ('offered','accepted','expired');
   UPDATE public.deliveries SET driver_id=NULL,status='pending',dispatch_state=CASE WHEN _action='assign' THEN 'dispatching' ELSE 'no_drivers' END,dispatch_wave=0 WHERE id=_id;
   IF _action='assign' THEN
    SELECT * INTO d FROM public.driver_profiles WHERE user_id=_assignee FOR UPDATE;
    IF NOT FOUND OR d.verification_status<>'approved' OR NOT d.available OR d.city<>'Harare' OR d.licence_url IS NULL OR d.id_document_url IS NULL THEN RAISE EXCEPTION 'Driver must be verified, online and document-ready in Harare'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.vehicles WHERE user_id=d.user_id AND active AND (j->>'service_tier'='express_bike' OR vehicle_type IN ('van','truck'))) THEN RAISE EXCEPTION 'An eligible active vehicle is required'; END IF;
    IF (SELECT count(*) FROM public.deliveries WHERE driver_id=d.user_id AND status IN ('accepted','arriving','picked_up'))>=3 THEN RAISE EXCEPTION 'Driver has no capacity'; END IF;
    INSERT INTO public.delivery_offers(delivery_id,driver_user_id,wave,status,expires_at) VALUES(_id,d.user_id,1,'offered',now()+interval '5 minutes') ON CONFLICT(delivery_id,driver_user_id) DO UPDATE SET status='offered',expires_at=excluded.expires_at,offered_at=now(),responded_at=NULL RETURNING id INTO offer;
    INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(d.user_id,'Admin assigned a delivery offer','Review and accept the offer before collection.','/driver','delivery_offer');
   END IF;
  END IF;
  IF old_user IS NOT NULL THEN INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(old_user,'Assignment changed',_reason,CASE WHEN _kind='booking' THEN '/provider/dashboard' ELSE '/driver' END,'assignment_changed'); END IF;
 ELSIF _action='cancel' THEN
  IF j->>'status' IN ('completed','delivered','refunded','disputed') OR j->>'payment_status'='paid' THEN RAISE EXCEPTION 'Completed, disputed or paid jobs require reconciliation'; END IF;
  EXECUTE format('UPDATE public.%I SET status=''cancelled'' WHERE id=$1',tbl) USING _id;
  UPDATE public.admin_job_changes SET status='withdrawn' WHERE kind=_kind AND job_id=_id AND status IN ('pending_customer','pending_assignee');
  IF _kind='booking' THEN UPDATE public.job_offers SET status='lost',responded_at=now() WHERE booking_id=_id AND status='offered'; ELSE UPDATE public.delivery_offers SET status='lost',responded_at=now() WHERE delivery_id=_id AND status='offered'; END IF;
 ELSIF _action='reopen' THEN
  RAISE EXCEPTION 'Cancelled jobs are terminal in the existing state machine. Create an approved replacement request instead.';
 ELSIF _action='withdraw_proposal' THEN
  UPDATE public.admin_job_changes SET status='withdrawn' WHERE kind=_kind AND job_id=_id AND status IN ('pending_customer','pending_assignee');
 ELSIF _action='propose' THEN
  IF j->>'status' IN ('completed','delivered','cancelled','refunded','disputed') OR j->>'payment_status'='paid' THEN RAISE EXCEPTION 'This job cannot be edited'; END IF;
  fields:=CASE WHEN _kind='booking' THEN ARRAY['address','lat','lng','description','scheduled_for','price','contact_phone','location_notes'] ELSE ARRAY['pickup_address','dropoff_address','pickup_lat','pickup_lng','dropoff_lat','dropoff_lng','recipient_name','recipient_phone','notes','parcel_size','price','distance_km','location_notes'] END;
  IF _patch IS NULL OR _patch='{}'::jsonb OR jsonb_typeof(_patch)<>'object' THEN RAISE EXCEPTION 'No changes provided'; END IF;
  FOR f IN SELECT jsonb_object_keys(_patch) LOOP
   IF NOT f=ANY(fields) THEN RAISE EXCEPTION 'Field is not editable: %',f; END IF;
   IF length(coalesce(_patch->>f,''))>2000 THEN RAISE EXCEPTION 'Field is too long'; END IF;
   IF f IN ('address','pickup_address','dropoff_address') AND length(trim(coalesce(_patch->>f,'')))<3 THEN RAISE EXCEPTION 'Address is required'; END IF;
   IF f='price' AND ((_patch->>f)::numeric<0 OR (_patch->>f)::numeric>100000 OR _patch->>f IS NULL) THEN RAISE EXCEPTION 'Invalid proposed price'; END IF;
  END LOOP;
  EXECUTE format('UPDATE public.%I SET updated_at=clock_timestamp() WHERE id=$1 RETURNING to_jsonb(%I.*)',tbl,tbl) INTO after_j USING _id;
  INSERT INTO public.admin_job_changes(kind,job_id,actor,customer_id,assignee_user_id,reason,before_values,proposed_values,expected_updated_at) VALUES(_kind,_id,auth.uid(),customer,old_user,_reason,j,_patch,(after_j->>'updated_at')::timestamptz) RETURNING id INTO change_id;
  INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(customer,'Approval needed for a job change',_reason,'/job-changes','job_change');
 ELSE RAISE EXCEPTION 'Unsupported admin action'; END IF;
 IF _action<>'propose' THEN EXECUTE format('UPDATE public.%I SET updated_at=clock_timestamp() WHERE id=$1',tbl) USING _id; END IF;
 EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1',tbl) INTO after_j USING _id;
 INSERT INTO public.admin_job_actions(action_key,kind,job_id,actor,action,reason,before_values,after_values) VALUES(_key,_kind,_id,auth.uid(),_action,_reason,j,after_j||jsonb_build_object('control', (SELECT to_jsonb(c) FROM public.admin_job_controls c WHERE kind=_kind AND job_id=_id),'proposed',_patch,'offer_id',offer));
 PERFORM public.log_admin_action('dispatch_'||_action,_kind,_id,jsonb_build_object('reason',_reason,'before',j,'after',after_j));
 IF _action NOT IN ('note','propose') THEN
  INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(customer,'Job updated by Zwits',_reason,CASE WHEN _kind='booking' THEN '/bookings/' ELSE '/deliveries/' END||_id::text,'admin_job_change');
  IF old_user IS NOT NULL AND _action NOT IN ('assign','unassign') THEN INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(old_user,'Job updated by Zwits',_reason,CASE WHEN _kind='booking' THEN '/provider/dashboard' ELSE '/driver' END,'admin_job_change'); END IF;
 END IF;
 RETURN jsonb_build_object('ok',true,'changeId',change_id,'offerId',offer);
END $$;
REVOKE ALL ON FUNCTION public.admin_dispatch_action(text,uuid,timestamptz,uuid,text,text,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_dispatch_action(text,uuid,timestamptz,uuid,text,text,uuid,jsonb) TO authenticated,service_role;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS contact_phone text, ADD COLUMN IF NOT EXISTS location_notes text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS location_notes text;
CREATE OR REPLACE FUNCTION public.respond_admin_job_change(_id uuid,_decision text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.admin_job_changes; jid uuid; k text; tbl text; j jsonb; assignments text; f text; apply_change boolean:=false;
BEGIN
 SELECT job_id,kind INTO jid,k FROM public.admin_job_changes WHERE id=_id;
 IF jid IS NULL THEN RAISE EXCEPTION 'Change not found'; END IF;
 tbl:=CASE WHEN k='booking' THEN 'bookings' ELSE 'deliveries' END;
 EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 FOR UPDATE',tbl) INTO j USING jid;
 SELECT * INTO c FROM public.admin_job_changes WHERE id=_id FOR UPDATE;
 IF auth.uid() IS NULL OR auth.uid() NOT IN (c.customer_id,coalesce(c.assignee_user_id,c.customer_id)) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF c.status NOT IN ('pending_customer','pending_assignee') THEN RAISE EXCEPTION 'Change is no longer pending'; END IF;
 IF c.expected_updated_at IS DISTINCT FROM (j->>'updated_at')::timestamptz THEN RAISE EXCEPTION 'Job changed; ask Zwits to withdraw and replace this proposal'; END IF;
 IF _decision='reject' THEN
  IF (c.status='pending_customer' AND auth.uid()<>c.customer_id) OR (c.status='pending_assignee' AND auth.uid()<>c.assignee_user_id) THEN RAISE EXCEPTION 'Not your decision'; END IF;
  UPDATE public.admin_job_changes SET status='rejected' WHERE id=_id;
 ELSIF _decision='approve' AND c.status='pending_customer' AND auth.uid()=c.customer_id THEN
  UPDATE public.admin_job_changes SET customer_decided_at=now(),status=CASE WHEN c.assignee_user_id IS NULL THEN 'applied' ELSE 'pending_assignee' END WHERE id=_id;
  apply_change:=c.assignee_user_id IS NULL;
  IF NOT apply_change THEN INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(c.assignee_user_id,'Acknowledge customer-approved changes',c.reason,'/job-changes','job_change'); END IF;
 ELSIF _decision='acknowledge' AND c.status='pending_assignee' AND auth.uid()=c.assignee_user_id THEN
  UPDATE public.admin_job_changes SET assignee_decided_at=now(),status='applied' WHERE id=_id; apply_change:=true;
 ELSE RAISE EXCEPTION 'Not your decision'; END IF;
 IF apply_change THEN
  SELECT string_agg(format('%I = r.%I',key,key),',') INTO assignments FROM jsonb_object_keys(c.proposed_values) key;
  PERFORM set_config('zwits.trusted','on',true); PERFORM set_config('zwits.dispatch_control','on',true);
  EXECUTE format('UPDATE public.%I t SET %s FROM jsonb_populate_record(NULL::public.%I,$1) r WHERE t.id=$2',tbl,assignments,tbl) USING j||c.proposed_values,jid;
 END IF;
 INSERT INTO public.admin_audit_log(actor,action,subject_type,subject_id,metadata) VALUES(auth.uid(),'job_change_'||_decision,k,jid,jsonb_build_object('change_id',_id,'before',c.before_values,'proposed',c.proposed_values));
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(c.actor,'Job change decision recorded',_decision,'/admin/dispatch','job_change');
 IF apply_change THEN INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(c.customer_id,'Approved changes applied',c.reason,CASE WHEN k='booking' THEN '/bookings/' ELSE '/deliveries/' END||jid::text,'job_change'); END IF;
 RETURN jsonb_build_object('ok',true,'applied',apply_change);
END $$;
REVOKE ALL ON FUNCTION public.respond_admin_job_change(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.respond_admin_job_change(uuid,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.respond_delivery_offer_atomic(_offer_id uuid,_action text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE jid uuid; o public.delivery_offers; d public.deliveries; p public.driver_profiles;
BEGIN
 SELECT delivery_id INTO jid FROM public.delivery_offers WHERE id=_offer_id;
 SELECT * INTO d FROM public.deliveries WHERE id=jid FOR UPDATE;
 SELECT * INTO o FROM public.delivery_offers WHERE id=_offer_id FOR UPDATE;
 IF auth.uid() IS NULL OR o.driver_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Offer not found'; END IF;
 IF o.status='accepted' AND d.driver_id=auth.uid() AND _action='accept' THEN RETURN jsonb_build_object('won',true,'deliveryId',jid,'idempotent',true); END IF;
 IF o.status<>'offered' OR o.expires_at<=now() OR d.driver_id IS NOT NULL OR d.status NOT IN ('pending','matching','offered') OR public.dispatch_job_blocked('delivery',jid) THEN RETURN jsonb_build_object('won',false,'reason','Offer expired, paused or already assigned'); END IF;
 IF _action='decline' THEN UPDATE public.delivery_offers SET status='declined',responded_at=now() WHERE id=_offer_id; PERFORM public.log_delivery_event(jid,'driver_declined',auth.uid(),jsonb_build_object('offer_id',_offer_id),NULL); RETURN jsonb_build_object('won',false,'declined',true); END IF;
 IF _action<>'accept' THEN RAISE EXCEPTION 'Invalid action'; END IF;
 SELECT * INTO p FROM public.driver_profiles WHERE user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR p.verification_status<>'approved' OR NOT p.available OR p.city<>'Harare' OR p.licence_url IS NULL OR p.id_document_url IS NULL THEN RAISE EXCEPTION 'Driver is not eligible'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.vehicles WHERE user_id=p.user_id AND active AND (d.service_tier='express_bike' OR vehicle_type IN ('van','truck'))) THEN RAISE EXCEPTION 'Eligible vehicle required'; END IF;
 IF (SELECT count(*) FROM public.deliveries WHERE driver_id=p.user_id AND status IN ('accepted','arriving','picked_up'))>=3 THEN RAISE EXCEPTION 'Driver has no capacity'; END IF;
 PERFORM set_config('zwits.trusted','on',true);
 UPDATE public.deliveries SET driver_id=auth.uid(),status='accepted',dispatch_state='assigned' WHERE id=jid;
 UPDATE public.delivery_offers SET status='accepted',responded_at=now() WHERE id=_offer_id;
 UPDATE public.delivery_offers SET status='lost',responded_at=now() WHERE delivery_id=jid AND id<>_offer_id AND status IN ('offered','expired');
 PERFORM public.log_delivery_event(jid,'driver_accepted',auth.uid(),jsonb_build_object('offer_id',_offer_id),NULL);
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(d.customer_id,'Driver accepted your delivery','Your assigned driver will collect your parcel.','/deliveries/'||jid::text,'delivery_accepted');
 RETURN jsonb_build_object('won',true,'deliveryId',jid);
END $$;
REVOKE ALL ON FUNCTION public.respond_delivery_offer_atomic(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.respond_delivery_offer_atomic(uuid,text) TO authenticated,service_role;