
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      WHEN 'in_progress' THEN
        v_title := 'Provider en route';
        v_body := 'Your ' || NEW.category || ' provider is on the way.';
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
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_status_change ON public.bookings;
CREATE TRIGGER trg_notify_booking_status_change
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_booking_status_change();
