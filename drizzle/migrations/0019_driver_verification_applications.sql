CREATE TABLE public.driver_verification_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), driver_profile_id uuid NOT NULL REFERENCES public.driver_profiles(id), user_id uuid NOT NULL,
 details jsonb NOT NULL, document_paths jsonb NOT NULL, vehicle_snapshot jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 review_reason text, reviewed_by uuid, submitted_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz
);
GRANT SELECT ON public.driver_verification_applications TO authenticated;
GRANT ALL ON public.driver_verification_applications TO service_role;
ALTER TABLE public.driver_verification_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers read own applications" ON public.driver_verification_applications FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY "Admins read driver applications" ON public.driver_verification_applications FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX driver_one_pending_application ON public.driver_verification_applications(driver_profile_id) WHERE status='pending';
ALTER TABLE public.driver_profiles ADD COLUMN verification_application_id uuid REFERENCES public.driver_verification_applications(id);
CREATE OR REPLACE FUNCTION public.driver_profile_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF public.is_trusted_writer() THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
 NEW.verification_status:='unverified'; NEW.reviewed_at:=NULL; NEW.submitted_at:=NULL; NEW.verification_application_id:=NULL;
 NEW.deliveries_completed:=0; NEW.rating_avg:=0; NEW.ratings_count:=0;
 ELSE
 NEW.user_id:=OLD.user_id; NEW.verification_status:=OLD.verification_status; NEW.reviewed_at:=OLD.reviewed_at;
 NEW.submitted_at:=OLD.submitted_at; NEW.verification_application_id:=OLD.verification_application_id;
 NEW.deliveries_completed:=OLD.deliveries_completed; NEW.rating_avg:=OLD.rating_avg; NEW.ratings_count:=OLD.ratings_count;
 IF ROW(NEW.full_name,NEW.licence_url,NEW.id_document_url,NEW.vehicle_doc_url,NEW.insurance_provider,NEW.insurance_expiry) IS DISTINCT FROM ROW(OLD.full_name,OLD.licence_url,OLD.id_document_url,OLD.vehicle_doc_url,OLD.insurance_provider,OLD.insurance_expiry) THEN
 IF OLD.verification_status='pending' THEN RAISE EXCEPTION 'Application under review; wait for the admin decision before changing verification details'; END IF;
 IF OLD.verification_status='approved' THEN NEW.verification_status:='unverified'; NEW.verification_application_id:=NULL; END IF;
 END IF;
 END IF;
 IF NEW.verification_status<>'approved' THEN NEW.available:=false; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.driver_vehicle_verification_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id uuid; p public.driver_profiles;
BEGIN
 owner_id:=CASE WHEN TG_OP='DELETE' THEN OLD.user_id ELSE NEW.user_id END;
 SELECT * INTO p FROM public.driver_profiles WHERE user_id=owner_id FOR UPDATE;
 IF p.verification_status='pending' THEN RAISE EXCEPTION 'Application under review; vehicles cannot change until the admin decision'; END IF;
 IF p.verification_status='approved' THEN
 PERFORM set_config('zwits.trusted','on',true);
 UPDATE public.driver_profiles SET verification_status='unverified',verification_application_id=NULL,available=false WHERE id=p.id;
 PERFORM set_config('zwits.trusted','off',true);
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER driver_vehicle_verification BEFORE INSERT OR UPDATE OR DELETE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.driver_vehicle_verification_guard();
CREATE OR REPLACE FUNCTION public.submit_driver_verification(_identity text,_licence text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.driver_profiles; vs jsonb; paths jsonb; app_id uuid; path text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'driver') THEN RAISE EXCEPTION 'Driver account required'; END IF;
 IF length(trim(coalesce(_identity,''))) NOT BETWEEN 5 AND 40 OR length(trim(coalesce(_licence,''))) NOT BETWEEN 3 AND 40 THEN RAISE EXCEPTION 'ID and licence numbers are required'; END IF;
 SELECT * INTO p FROM public.driver_profiles WHERE user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Save your driver profile first'; END IF;
 IF p.verification_status IN ('pending','approved') THEN RAISE EXCEPTION 'Application already pending or approved'; END IF;
 IF length(trim(coalesce(p.full_name,'')))<3 OR length(trim(coalesce(p.phone,'')))<7 OR p.city<>'Harare' OR cardinality(p.services)=0 THEN RAISE EXCEPTION 'Save your name, phone and Harare delivery services first'; END IF;
 SELECT jsonb_agg(to_jsonb(v)) INTO vs FROM public.vehicles v WHERE user_id=auth.uid() AND active AND length(trim(plate))>=3 AND length(trim(coalesce(make,'')))>0 AND length(trim(coalesce(model,'')))>0;
 IF vs IS NULL THEN RAISE EXCEPTION 'A registered active vehicle with make, model and plate is required'; END IF;
 IF p.insurance_provider IS NULL OR p.insurance_expiry IS NULL OR p.insurance_expiry<current_date THEN RAISE EXCEPTION 'Current insurance details are required'; END IF;
 paths:=jsonb_build_object('id',p.id_document_url,'licence',p.licence_url,'registration',p.vehicle_doc_url);
 FOR path IN SELECT value FROM jsonb_each_text(paths) LOOP
 IF path IS NULL OR split_part(path,'/',1)<>auth.uid()::text OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='provider-verification' AND name=path AND (metadata->>'size')::bigint BETWEEN 1 AND 5242880 AND metadata->>'mimetype' IN ('image/jpeg','image/png','image/webp','application/pdf')) THEN RAISE EXCEPTION 'Upload valid private ID, licence and registration documents'; END IF;
 END LOOP;
 INSERT INTO public.driver_verification_applications(driver_profile_id,user_id,details,document_paths,vehicle_snapshot)
 VALUES(p.id,p.user_id,jsonb_build_object('full_name',p.full_name,'phone',p.phone,'city',p.city,'identity_number',trim(_identity),'licence_number',trim(_licence),'insurance_provider',p.insurance_provider,'insurance_expiry',p.insurance_expiry),paths,vs) RETURNING id INTO app_id;
 PERFORM set_config('zwits.trusted','on',true);
 UPDATE public.driver_profiles SET verification_status='pending',verification_application_id=app_id,submitted_at=now(),reviewed_at=NULL,available=false WHERE id=p.id;
 PERFORM set_config('zwits.trusted','off',true);
 RETURN jsonb_build_object('ok',true,'id',app_id);
END $$;
CREATE OR REPLACE FUNCTION public.admin_review_driver(_application uuid,_status text,_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.driver_verification_applications; p public.driver_profiles;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _status NOT IN ('approved','rejected') OR length(trim(coalesce(_reason,''))) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Decision and review reason required'; END IF;
 SELECT dp.* INTO p FROM public.driver_profiles dp JOIN public.driver_verification_applications da ON da.driver_profile_id=dp.id WHERE da.id=_application FOR UPDATE OF dp;
 SELECT * INTO a FROM public.driver_verification_applications WHERE id=_application FOR UPDATE;
 IF a.id IS NULL OR a.status<>'pending' OR p.verification_application_id IS DISTINCT FROM a.id OR p.verification_status<>'pending' THEN RAISE EXCEPTION 'Application changed; refresh before reviewing'; END IF;
 IF _status='approved' AND (p.insurance_expiry IS NULL OR p.insurance_expiry<current_date OR NOT EXISTS(SELECT 1 FROM public.vehicles WHERE user_id=a.user_id AND active) OR EXISTS(SELECT 1 FROM jsonb_each_text(a.document_paths) d WHERE NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='provider-verification' AND o.name=d.value))) THEN RAISE EXCEPTION 'Current insurance, vehicle and documents required before approval'; END IF;
 UPDATE public.driver_verification_applications SET status=_status,review_reason=trim(_reason),reviewed_by=auth.uid(),reviewed_at=now() WHERE id=a.id;
 PERFORM set_config('zwits.trusted','on',true);
 UPDATE public.driver_profiles SET verification_status=CASE WHEN _status='approved' THEN 'approved' ELSE 'revoked' END,reviewed_at=now(),available=false WHERE id=p.id;
 PERFORM set_config('zwits.trusted','off',true);
 PERFORM public.log_admin_action('driver_'||_status,'driver',p.id,jsonb_build_object('application_id',a.id,'reason',trim(_reason),'previous_status',p.verification_status));
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(a.user_id,'Driver verification '||_status,trim(_reason),'/driver','verification_'||_status);
 RETURN jsonb_build_object('ok',true,'status',_status);
END $$;
REVOKE ALL ON FUNCTION public.submit_driver_verification(text,text),public.admin_review_driver(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_driver_verification(text,text),public.admin_review_driver(uuid,text,text) TO authenticated,service_role;
ALTER POLICY "Providers delete own verification docs" ON storage.objects USING(bucket_id='provider-verification' AND (storage.foldername(name))[1]=auth.uid()::text AND NOT EXISTS(SELECT 1 FROM public.driver_verification_applications a WHERE a.user_id=auth.uid() AND a.document_paths @> jsonb_build_object('id',name) OR a.user_id=auth.uid() AND a.document_paths @> jsonb_build_object('licence',name) OR a.user_id=auth.uid() AND a.document_paths @> jsonb_build_object('registration',name)));
ALTER POLICY "Providers update own verification docs" ON storage.objects USING(bucket_id='provider-verification' AND (storage.foldername(name))[1]=auth.uid()::text AND NOT EXISTS(SELECT 1 FROM public.driver_verification_applications a,jsonb_each_text(a.document_paths) d WHERE a.user_id=auth.uid() AND d.value=name)) WITH CHECK(bucket_id='provider-verification' AND (storage.foldername(name))[1]=auth.uid()::text);
