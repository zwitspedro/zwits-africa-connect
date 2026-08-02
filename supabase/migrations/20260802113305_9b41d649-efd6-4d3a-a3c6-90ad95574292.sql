ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'travelling' AFTER 'accepted';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'arrived' AFTER 'travelling';

ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS booking_status_history_booking_idx ON public.booking_status_history(booking_id, created_at DESC);

GRANT SELECT ON public.booking_status_history TO authenticated;
GRANT ALL ON public.booking_status_history TO service_role;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking parties view status history"
ON public.booking_status_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    LEFT JOIN public.providers pr ON pr.id = b.provider_id
    WHERE b.id = booking_status_history.booking_id
      AND (b.customer_id = auth.uid() OR pr.user_id = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_status_history (booking_id, status, changed_by)
    VALUES (NEW.id, NEW.status::text, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.booking_status_history (booking_id, status, changed_by)
    VALUES (NEW.id, NEW.status::text, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_booking_status ON public.bookings;
CREATE TRIGGER trg_log_booking_status
AFTER INSERT OR UPDATE OF status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.log_booking_status_change();

CREATE TABLE IF NOT EXISTS public.provider_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_user_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL,
  destination TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  note TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS provider_withdrawals_user_idx ON public.provider_withdrawals(provider_user_id, created_at DESC);

GRANT SELECT, INSERT ON public.provider_withdrawals TO authenticated;
GRANT ALL ON public.provider_withdrawals TO service_role;
ALTER TABLE public.provider_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers view own withdrawals"
ON public.provider_withdrawals FOR SELECT TO authenticated
USING (provider_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Providers request own withdrawals"
ON public.provider_withdrawals FOR INSERT TO authenticated
WITH CHECK (provider_user_id = auth.uid() AND status = 'requested');

CREATE POLICY "Admins update withdrawals"
ON public.provider_withdrawals FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_provider_withdrawals_updated_at
BEFORE UPDATE ON public.provider_withdrawals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();