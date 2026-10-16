CREATE OR REPLACE FUNCTION public.admin_review_provider(_id uuid,_status text,_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.providers;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _status NOT IN ('approved','revoked','pending') OR length(trim(coalesce(_reason,'')))<3 THEN RAISE EXCEPTION 'Valid review state and reason required'; END IF;
 SELECT * INTO p FROM public.providers WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Provider not found'; END IF;
 IF _status='approved' AND (p.id_document_url IS NULL OR p.selfie_url IS NULL) THEN RAISE EXCEPTION 'ID and selfie documents are required before approval'; END IF;
 UPDATE public.providers SET verification_status=_status::public.provider_verification_status,verified=(_status='approved'),available=false,reviewed_by=auth.uid(),reviewed_at=now(),revoke_reason=CASE WHEN _status='revoked' THEN _reason ELSE NULL END WHERE id=p.id;
 INSERT INTO public.provider_document_audits(provider_user_id,doc_key,status,errors) VALUES(p.user_id,'verification_review',_status,ARRAY[_reason]);
 PERFORM public.log_admin_action('provider_'||_status,'provider',p.id,jsonb_build_object('reason',_reason,'previous_status',p.verification_status));
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(p.user_id,'Verification '||_status,_reason,'/provider/dashboard','verification_'||_status);
 RETURN jsonb_build_object('ok',true,'status',_status);
END $$;
REVOKE ALL ON FUNCTION public.admin_review_provider(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_review_provider(uuid,text,text) TO authenticated;