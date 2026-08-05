-- 1. Lifecycle notifications: add travelling / arrived / in_progress
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_title TEXT;
  v_body TEXT;
  v_kind TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.status
      WHEN 'accepted' THEN
        v_title := 'Booking accepted';
        v_body := 'A provider accepted your ' || NEW.category || ' booking.';
        v_kind := 'booking_accepted';
      WHEN 'travelling' THEN
        v_title := 'Provider on the way';
        v_body := 'Your ' || NEW.category || ' provider is travelling to you.';
        v_kind := 'booking_travelling';
      WHEN 'arrived' THEN
        v_title := 'Provider has arrived';
        v_body := 'Your ' || NEW.category || ' provider has arrived at the address.';
        v_kind := 'booking_arrived';
      WHEN 'in_progress' THEN
        v_title := 'Work started';
        v_body := 'Your ' || NEW.category || ' job is now in progress.';
        v_kind := 'booking_in_progress';
      WHEN 'completed' THEN
        v_title := 'Booking completed';
        v_body := 'Your ' || NEW.category || ' booking is complete.';
        v_kind := 'booking_completed';
      WHEN 'cancelled' THEN
        v_title := 'Booking cancelled';
        v_body := 'Your ' || NEW.category || ' booking was cancelled.';
        v_kind := 'booking_cancelled';
      ELSE
        RETURN NEW;
    END CASE;

    INSERT INTO public.notifications (user_id, title, body, link, kind)
    VALUES (NEW.customer_id, v_title, v_body, '/bookings/' || NEW.id, v_kind);
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Delivery dispatch audit trail
CREATE TABLE IF NOT EXISTS public.delivery_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  actor UUID,
  metadata JSONB,
  dedupe_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.delivery_events TO authenticated;
GRANT ALL ON public.delivery_events TO service_role;

ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view delivery events" ON public.delivery_events;
CREATE POLICY "Participants view delivery events"
ON public.delivery_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deliveries d
    WHERE d.id = delivery_events.delivery_id
      AND (d.customer_id = auth.uid() OR d.driver_id = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE INDEX IF NOT EXISTS delivery_events_delivery_idx
  ON public.delivery_events (delivery_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS delivery_events_dedupe_idx
  ON public.delivery_events (delivery_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.log_delivery_event(
  _delivery_id uuid,
  _event text,
  _actor uuid DEFAULT NULL,
  _metadata jsonb DEFAULT NULL,
  _dedupe_key text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  INSERT INTO public.delivery_events (delivery_id, event, actor, metadata, dedupe_key)
  VALUES (_delivery_id, _event, _actor, _metadata, _dedupe_key)
  ON CONFLICT (delivery_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
$function$;

REVOKE ALL ON FUNCTION public.log_delivery_event(uuid, text, uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_delivery_event(uuid, text, uuid, jsonb, text) TO service_role;

-- 3. Set-based availability lookup (identical semantics, one round trip)
CREATE OR REPLACE FUNCTION public.providers_available_at(_user_ids uuid[], _at timestamptz)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT u.uid
  FROM unnest(_user_ids) AS u(uid)
  WHERE public.is_provider_available_at(u.uid, _at)
$function$;

REVOKE ALL ON FUNCTION public.providers_available_at(uuid[], timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.providers_available_at(uuid[], timestamptz) TO service_role;

-- 4. Extensions used by the scheduled dispatch sweeper
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;