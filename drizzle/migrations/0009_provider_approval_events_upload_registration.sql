CREATE TABLE public.provider_review_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider_id uuid NOT NULL REFERENCES public.providers(id), provider_user_id uuid NOT NULL, actor uuid NOT NULL, status text NOT NULL, reason text NOT NULL, email_state text NOT NULL DEFAULT 'not_requested', created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.provider_review_events TO authenticated;
GRANT ALL ON public.provider_review_events TO service_role;
ALTER TABLE public.provider_review_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Provider and admin review history" ON public.provider_review_events FOR SELECT TO authenticated USING(provider_user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.capture_provider_review_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.subject_type='provider' AND NEW.action IN ('provider_approved','provider_rejected','provider_revoked','provider_pending') THEN
  INSERT INTO public.provider_review_events(provider_id,provider_user_id,actor,status,reason)
  SELECT id,user_id,NEW.actor,replace(NEW.action,'provider_',''),coalesce(NEW.metadata->>'reason','') FROM public.providers WHERE id=NEW.subject_id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER capture_provider_review_event AFTER INSERT ON public.admin_audit_log FOR EACH ROW EXECUTE FUNCTION public.capture_provider_review_event();
CREATE OR REPLACE FUNCTION public.admin_register_provider_document(_provider_id uuid,_doc_key text,_path text,_file_name text,_file_size bigint,_mime text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.providers;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _doc_key NOT IN ('id_document_url','selfie_url','business_doc_url') OR _file_size<20480 OR _file_size>10485760 OR _mime NOT IN ('image/jpeg','image/png','image/webp','application/pdf') OR (_doc_key='selfie_url' AND _mime='application/pdf') THEN RAISE EXCEPTION 'Invalid verification document'; END IF;
 SELECT * INTO p FROM public.providers WHERE id=_provider_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Provider not found'; END IF;
 IF _path NOT LIKE p.user_id::text||'/admin-review/%' OR _path LIKE '%..%' THEN RAISE EXCEPTION 'Invalid document path'; END IF;
 UPDATE public.providers SET id_document_url=CASE WHEN _doc_key='id_document_url' THEN _path ELSE id_document_url END,selfie_url=CASE WHEN _doc_key='selfie_url' THEN _path ELSE selfie_url END,business_doc_url=CASE WHEN _doc_key='business_doc_url' THEN _path ELSE business_doc_url END,verification_status='pending',verified=false,available=false,submitted_at=now(),revoke_reason=NULL WHERE id=p.id;
 UPDATE public.provider_documents SET file_url=_path,verification_status='pending',rejection_reason=NULL,reviewed_by=NULL,reviewed_at=NULL WHERE provider_user_id=p.user_id AND document_type=replace(_doc_key,'_url','');
 INSERT INTO public.provider_document_audits(provider_user_id,doc_key,file_name,file_size,mime_type,status,errors,storage_path) VALUES(p.user_id,_doc_key,left(_file_name,200),_file_size,_mime,'uploaded',ARRAY[]::text[],_path);
 PERFORM public.log_admin_action('provider_document_uploaded','provider',p.id,jsonb_build_object('doc_key',_doc_key,'previous_status',p.verification_status));
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(p.user_id,'Verification document updated','An administrator uploaded a document for your profile. Your profile is awaiting review.','/provider/dashboard?section=documents','verification_document_uploaded');
 RETURN jsonb_build_object('ok',true,'status','pending');
END $$;
REVOKE ALL ON FUNCTION public.admin_register_provider_document(uuid,text,text,text,bigint,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_register_provider_document(uuid,text,text,text,bigint,text) TO authenticated;
REVOKE ALL ON FUNCTION public.capture_provider_review_event() FROM PUBLIC,anon,authenticated;
