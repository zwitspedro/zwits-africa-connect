CREATE OR REPLACE FUNCTION public.validate_admin_change_record() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j jsonb; f text; v jsonb; distance numeric; base numeric; perkm numeric; multiplier numeric; a numeric; b numeric; c numeric; d numeric; s numeric; current_assignee uuid;
BEGIN
 IF NEW.kind='booking' THEN SELECT to_jsonb(t) INTO j FROM public.bookings t WHERE id=NEW.job_id FOR UPDATE; SELECT user_id INTO current_assignee FROM public.providers WHERE id=(j->>'provider_id')::uuid;
 ELSE SELECT to_jsonb(t) INTO j FROM public.deliveries t WHERE id=NEW.job_id FOR UPDATE; current_assignee:=(j->>'driver_id')::uuid; END IF;
 IF j IS NULL OR NEW.customer_id IS DISTINCT FROM (j->>'customer_id')::uuid OR NEW.assignee_user_id IS DISTINCT FROM current_assignee THEN RAISE EXCEPTION 'Job participants changed'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.kind IS DISTINCT FROM OLD.kind OR NEW.job_id IS DISTINCT FROM OLD.job_id OR NEW.proposed_values IS DISTINCT FROM OLD.proposed_values OR NEW.before_values IS DISTINCT FROM OLD.before_values THEN RAISE EXCEPTION 'Proposals are immutable'; END IF;
  RETURN NEW;
 END IF;
 FOR f IN SELECT jsonb_object_keys(NEW.proposed_values) LOOP
  IF NOT f=ANY(CASE WHEN NEW.kind='booking' THEN ARRAY['address','description','scheduled_for','price','contact_phone','location_notes','lat','lng'] ELSE ARRAY['pickup_address','dropoff_address','pickup_lat','pickup_lng','dropoff_lat','dropoff_lng','recipient_name','recipient_phone','notes','parcel_size','price','distance_km','location_notes'] END) THEN RAISE EXCEPTION 'Field is not editable'; END IF;
  IF length(coalesce(NEW.proposed_values->>f,''))>2000 THEN RAISE EXCEPTION 'Field too long'; END IF;
  IF f IN ('lat','pickup_lat','dropoff_lat') AND abs((NEW.proposed_values->>f)::numeric)>90 THEN RAISE EXCEPTION 'Invalid latitude'; END IF;
  IF f IN ('lng','pickup_lng','dropoff_lng') AND abs((NEW.proposed_values->>f)::numeric)>180 THEN RAISE EXCEPTION 'Invalid longitude'; END IF;
 END LOOP;
 v:=j||NEW.proposed_values;
 IF NEW.kind='delivery' AND NEW.proposed_values ?| ARRAY['pickup_address','dropoff_address','pickup_lat','pickup_lng','dropoff_lat','dropoff_lng','parcel_size','price','distance_km'] THEN
  a:=(v->>'pickup_lat')::numeric; b:=(v->>'pickup_lng')::numeric;c:=(v->>'dropoff_lat')::numeric;d:=(v->>'dropoff_lng')::numeric;
  IF a IS NULL OR b IS NULL OR c IS NULL OR d IS NULL OR abs(a)>90 OR abs(c)>90 OR abs(b)>180 OR abs(d)>180 THEN RAISE EXCEPTION 'Complete valid route coordinates required for price changes'; END IF;
  IF NEW.proposed_values ? 'pickup_address' AND NEW.proposed_values->>'pickup_address' IS DISTINCT FROM j->>'pickup_address' AND NOT (NEW.proposed_values ? 'pickup_lat' AND NEW.proposed_values ? 'pickup_lng') THEN RAISE EXCEPTION 'Corrected pickup coordinates required'; END IF;
  IF NEW.proposed_values ? 'dropoff_address' AND NEW.proposed_values->>'dropoff_address' IS DISTINCT FROM j->>'dropoff_address' AND NOT (NEW.proposed_values ? 'dropoff_lat' AND NEW.proposed_values ? 'dropoff_lng') THEN RAISE EXCEPTION 'Corrected destination coordinates required'; END IF;
  s:=power(sin(radians((c-a)::double precision)/2),2)+cos(radians(a::double precision))*cos(radians(c::double precision))*power(sin(radians((d-b)::double precision)/2),2);
  distance:=round((12742*asin(sqrt(least(1,s))) )::numeric,1);
  base:=CASE v->>'service_tier' WHEN 'express_bike' THEN 3 WHEN 'standard_van' THEN 12 WHEN 'business_courier' THEN 20 ELSE NULL END;
  perkm:=CASE v->>'service_tier' WHEN 'express_bike' THEN 0.55 WHEN 'standard_van' THEN 0.9 WHEN 'business_courier' THEN 0.8 ELSE NULL END;
  multiplier:=CASE v->>'parcel_size' WHEN 'small' THEN 1 WHEN 'medium' THEN 1.15 WHEN 'large' THEN 1.4 ELSE NULL END;
  IF base IS NULL OR multiplier IS NULL THEN RAISE EXCEPTION 'Invalid delivery tier or parcel size'; END IF;
  NEW.proposed_values:=NEW.proposed_values||jsonb_build_object('distance_km',distance,'price',round((base+perkm*greatest(1,distance))*multiplier,2));
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER admin_change_validation BEFORE INSERT OR UPDATE ON public.admin_job_changes FOR EACH ROW EXECUTE FUNCTION public.validate_admin_change_record();
CREATE OR REPLACE FUNCTION public.update_delivery_progress_atomic(_id uuid,_status text,_proof text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.deliveries;
BEGIN
 SELECT * INTO d FROM public.deliveries WHERE id=_id FOR UPDATE;
 IF auth.uid() IS NULL OR NOT (d.driver_id=auth.uid() OR (d.customer_id=auth.uid() AND _status='cancelled')) THEN RAISE EXCEPTION 'Not allowed'; END IF;
 IF d.status=_status THEN RETURN jsonb_build_object('ok',true,'unchanged',true); END IF;
 IF _status NOT IN ('picked_up','delivered','cancelled') OR NOT public.delivery_transition_allowed(d.status,_status) THEN RAISE EXCEPTION 'Invalid delivery transition'; END IF;
 IF _status<>'cancelled' AND public.dispatch_job_blocked('delivery',_id) THEN RAISE EXCEPTION 'Job is on hold or awaiting approval'; END IF;
 IF _status='delivered' THEN
  IF _proof IS NULL OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='job-photos' AND name=_proof AND name LIKE auth.uid()::text||'/%') THEN RAISE EXCEPTION 'Upload authorised delivery evidence before completing'; END IF;
 END IF;
 PERFORM set_config('zwits.trusted','on',true);
 UPDATE public.deliveries SET status=_status,picked_up_at=CASE WHEN _status='picked_up' THEN now() ELSE picked_up_at END,delivered_at=CASE WHEN _status='delivered' THEN now() ELSE delivered_at END,proof_photo_url=CASE WHEN _status='delivered' THEN _proof ELSE proof_photo_url END WHERE id=_id;
 IF _status='delivered' THEN UPDATE public.driver_profiles SET deliveries_completed=deliveries_completed+1 WHERE user_id=d.driver_id; END IF;
 PERFORM public.log_delivery_event(_id,'delivery_'||_status,auth.uid(),jsonb_build_object('proof',_proof),NULL);
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(CASE WHEN auth.uid()=d.driver_id THEN d.customer_id ELSE d.driver_id END,'Delivery progress updated',replace(_status,'_',' '),'/deliveries/'||_id::text,'delivery_'||_status);
 IF _status='delivered' AND d.payment_status='paid' THEN PERFORM public.settle_delivery(_id); END IF;
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.update_delivery_progress_atomic(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_delivery_progress_atomic(uuid,text,text) TO authenticated,service_role;