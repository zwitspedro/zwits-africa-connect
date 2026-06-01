
CREATE OR REPLACE FUNCTION public.notify_provider_booking_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_user UUID;
  v_title TEXT;
  v_body TEXT;
  v_kind TEXT;
BEGIN
  IF NEW.provider_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_provider_user FROM public.providers WHERE id = NEW.provider_id;
  IF v_provider_user IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_title := 'New booking request';
    v_body := 'You have a new ' || NEW.category || ' booking.';
    v_kind := 'provider_new_booking';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'cancelled' THEN
      v_title := 'Booking cancelled';
      v_body := 'A ' || NEW.category || ' booking was cancelled.';
      v_kind := 'provider_booking_cancelled';
    ELSIF NEW.status = 'completed' THEN
      v_title := 'Booking completed';
      v_body := 'A ' || NEW.category || ' booking was marked complete.';
      v_kind := 'provider_booking_completed';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, link, kind)
  VALUES (v_provider_user, v_title, v_body, '/bookings/' || NEW.id, v_kind);

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_provider_booking_event() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_provider_booking_insert ON public.bookings;
CREATE TRIGGER trg_notify_provider_booking_insert
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_provider_booking_event();

DROP TRIGGER IF EXISTS trg_notify_provider_booking_status ON public.bookings;
CREATE TRIGGER trg_notify_provider_booking_status
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_provider_booking_event();
