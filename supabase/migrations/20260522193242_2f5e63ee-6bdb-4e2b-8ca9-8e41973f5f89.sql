
-- Booking status enum
CREATE TYPE public.booking_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');

-- Providers
CREATE TABLE public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  category TEXT NOT NULL,
  bio TEXT,
  city TEXT NOT NULL,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  available BOOLEAN NOT NULL DEFAULT true,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  ratings_count INTEGER NOT NULL DEFAULT 0,
  jobs_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers viewable by authenticated"
  ON public.providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own provider profile"
  ON public.providers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own provider profile"
  ON public.providers FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_providers_updated_at
BEFORE UPDATE ON public.providers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_providers_category ON public.providers(category);
CREATE INDEX idx_providers_city ON public.providers(city);

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ,
  status booking_status NOT NULL DEFAULT 'pending',
  price NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Customer can see their own bookings
CREATE POLICY "Customers view own bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = customer_id);

-- Provider can see bookings assigned to their provider profile
CREATE POLICY "Providers view assigned bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

-- Customers create bookings
CREATE POLICY "Customers create bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

-- Customers can update (e.g. cancel) own bookings
CREATE POLICY "Customers update own bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id);

-- Provider can update bookings assigned to them (status changes)
CREATE POLICY "Providers update assigned bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX idx_bookings_provider ON public.bookings(provider_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);

-- Ratings
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings viewable by authenticated"
  ON public.ratings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Customers create ratings for own bookings"
  ON public.ratings FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = customer_id
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.customer_id = auth.uid() AND b.status = 'completed'
    )
  );

-- Trigger: update provider aggregate rating + jobs_completed when rating added
CREATE OR REPLACE FUNCTION public.recompute_provider_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg NUMERIC(3,2);
  v_count INTEGER;
BEGIN
  SELECT COALESCE(AVG(rating), 0)::NUMERIC(3,2), COUNT(*)
    INTO v_avg, v_count
    FROM public.ratings WHERE provider_id = NEW.provider_id;

  UPDATE public.providers
    SET rating_avg = v_avg, ratings_count = v_count
    WHERE id = NEW.provider_id;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recompute_provider_rating() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_recompute_provider_rating
AFTER INSERT ON public.ratings
FOR EACH ROW EXECUTE FUNCTION public.recompute_provider_rating();

-- Trigger: when booking completed, increment provider jobs_completed
CREATE OR REPLACE FUNCTION public.bump_jobs_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' AND NEW.provider_id IS NOT NULL THEN
    UPDATE public.providers
      SET jobs_completed = jobs_completed + 1
      WHERE id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bump_jobs_completed() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_bump_jobs_completed
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bump_jobs_completed();
