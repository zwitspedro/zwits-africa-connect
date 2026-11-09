-- Requires privileged test execution. No persistent changes or emails sent.
BEGIN;
DO $$ DECLARE a uuid; p public.providers; r uuid; BEGIN
 SELECT user_id INTO a FROM public.user_roles WHERE role='admin' ORDER BY created_at LIMIT 1;
 SELECT * INTO p FROM public.providers WHERE user_id=a LIMIT 1;
 IF p.id IS NULL THEN RAISE EXCEPTION 'An admin provider is required for this rolled-back regression'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 PERFORM public.admin_register_provider_document(p.id,'id_document_url',p.user_id||'/admin-review/test-id.jpg','test.jpg',30000,'image/jpeg');
 IF (SELECT verification_status FROM public.providers WHERE id=p.id)<>'pending' OR (SELECT available FROM public.providers WHERE id=p.id) THEN RAISE EXCEPTION 'Uploaded provider must be pending and offline'; END IF;
 PERFORM public.admin_review_provider(p.id,'rejected','Temporary approval queue regression');
 SELECT id INTO r FROM public.provider_review_events WHERE provider_id=p.id AND reason='Temporary approval queue regression';
 IF r IS NULL THEN RAISE EXCEPTION 'Review event missing'; END IF;
 INSERT INTO public.email_send_log(message_id,template_name,recipient_email,status) VALUES(r::text,'provider-decision','regression@example.invalid','sent');
 IF (SELECT email_state FROM public.provider_review_events WHERE id=r)<>'sent' THEN RAISE EXCEPTION 'Email status did not track'; END IF;
 INSERT INTO public.email_send_log(message_id,template_name,recipient_email,status) VALUES(r::text,'provider-decision','regression@example.invalid','dlq');
 IF (SELECT email_state FROM public.provider_review_events WHERE id=r)<>'failed' THEN RAISE EXCEPTION 'Email failure did not track'; END IF;
 PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
 BEGIN PERFORM public.admin_register_provider_document(p.id,'id_document_url',p.user_id||'/admin-review/test.jpg','test.jpg',30000,'image/jpeg'); RAISE EXCEPTION 'FAIL unauthorized upload'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Forbidden' THEN RAISE; END IF; END;
 END $$;
ROLLBACK;