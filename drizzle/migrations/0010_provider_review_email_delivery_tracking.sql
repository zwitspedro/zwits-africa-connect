CREATE OR REPLACE FUNCTION public.track_provider_review_email() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.template_name='provider-decision' AND NEW.status IN ('sent','failed','dlq','suppressed','bounced','complained') THEN
  UPDATE public.provider_review_events SET email_state=CASE WHEN NEW.status IN ('dlq','bounced','complained') THEN 'failed' ELSE NEW.status END WHERE id::text=NEW.message_id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER track_provider_review_email AFTER INSERT ON public.email_send_log FOR EACH ROW EXECUTE FUNCTION public.track_provider_review_email();
REVOKE ALL ON FUNCTION public.track_provider_review_email() FROM PUBLIC,anon,authenticated;