-- 1. Bookings extensions
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS budget NUMERIC,
  ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fulfilment_mode TEXT NOT NULL DEFAULT 'dispatch',
  ADD COLUMN IF NOT EXISTS dispatch_state TEXT NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS dispatch_wave INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispatch_radius_km NUMERIC NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS dispatch_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Job offers
CREATE TABLE IF NOT EXISTS public.job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  provider_user_id UUID NOT NULL,
  wave INTEGER NOT NULL DEFAULT 1,
  distance_km NUMERIC,
  status TEXT NOT NULL DEFAULT 'offered',
  offered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, provider_id)
);

GRANT SELECT, INSERT, UPDATE ON public.job_offers TO authenticated;
GRANT ALL ON public.job_offers TO service_role;
ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers view own offers" ON public.job_offers
  FOR SELECT TO authenticated
  USING (provider_user_id = auth.uid());

CREATE POLICY "Customers view offers on own bookings" ON public.job_offers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = job_offers.booking_id AND b.customer_id = auth.uid()));

CREATE POLICY "Providers respond to own offers" ON public.job_offers
  FOR UPDATE TO authenticated
  USING (provider_user_id = auth.uid())
  WITH CHECK (provider_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS job_offers_provider_status_idx ON public.job_offers (provider_user_id, status);
CREATE INDEX IF NOT EXISTS job_offers_booking_idx ON public.job_offers (booking_id);

CREATE TRIGGER job_offers_updated_at BEFORE UPDATE ON public.job_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Job quotes
CREATE TABLE IF NOT EXISTS public.job_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  provider_user_id UUID NOT NULL,
  price NUMERIC NOT NULL,
  eta_minutes INTEGER NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, provider_id)
);

GRANT SELECT, INSERT, UPDATE ON public.job_quotes TO authenticated;
GRANT ALL ON public.job_quotes TO service_role;
ALTER TABLE public.job_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers manage own quotes" ON public.job_quotes
  FOR SELECT TO authenticated
  USING (provider_user_id = auth.uid());

CREATE POLICY "Customers view quotes on own bookings" ON public.job_quotes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = job_quotes.booking_id AND b.customer_id = auth.uid()));

CREATE POLICY "Providers submit quotes" ON public.job_quotes
  FOR INSERT TO authenticated
  WITH CHECK (provider_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.job_offers o WHERE o.booking_id = job_quotes.booking_id AND o.provider_id = job_quotes.provider_id AND o.provider_user_id = auth.uid()));

CREATE POLICY "Providers update own quotes" ON public.job_quotes
  FOR UPDATE TO authenticated
  USING (provider_user_id = auth.uid())
  WITH CHECK (provider_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS job_quotes_booking_idx ON public.job_quotes (booking_id);

CREATE TRIGGER job_quotes_updated_at BEFORE UPDATE ON public.job_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Customer ratings (provider rates the customer)
CREATE TABLE IF NOT EXISTS public.customer_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  provider_user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, provider_id)
);

GRANT SELECT, INSERT ON public.customer_ratings TO authenticated;
GRANT ALL ON public.customer_ratings TO service_role;
ALTER TABLE public.customer_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers rate their customers" ON public.customer_ratings
  FOR INSERT TO authenticated
  WITH CHECK (provider_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = customer_ratings.booking_id AND b.provider_id = customer_ratings.provider_id AND b.status = 'completed'));

CREATE POLICY "Involved parties view customer ratings" ON public.customer_ratings
  FOR SELECT TO authenticated
  USING (provider_user_id = auth.uid() OR customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 5. Realtime
ALTER TABLE public.job_offers REPLICA IDENTITY FULL;
ALTER TABLE public.job_quotes REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.job_offers;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.job_quotes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;