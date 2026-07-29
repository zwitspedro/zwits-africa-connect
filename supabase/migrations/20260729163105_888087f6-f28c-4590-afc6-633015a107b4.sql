-- DRIVER PROFILES
CREATE TABLE public.driver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  city TEXT NOT NULL DEFAULT 'Harare',
  zone_radius_km NUMERIC NOT NULL DEFAULT 10,
  available BOOLEAN NOT NULL DEFAULT false,
  licence_url TEXT,
  id_document_url TEXT,
  vehicle_doc_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  deliveries_completed INTEGER NOT NULL DEFAULT 0,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  ratings_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.driver_profiles TO authenticated;
GRANT ALL ON public.driver_profiles TO service_role;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers manage own profile" ON public.driver_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view driver profiles" ON public.driver_profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update driver profiles" ON public.driver_profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- VEHICLES
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'bike',
  make TEXT,
  model TEXT,
  colour TEXT,
  plate TEXT NOT NULL,
  capacity_kg NUMERIC,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers manage own vehicles" ON public.vehicles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view vehicles" ON public.vehicles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- DELIVERIES
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  driver_id UUID,
  service_tier TEXT NOT NULL DEFAULT 'express_bike',
  pickup_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  dropoff_address TEXT NOT NULL,
  dropoff_lat DOUBLE PRECISION,
  dropoff_lng DOUBLE PRECISION,
  recipient_name TEXT,
  recipient_phone TEXT,
  parcel_size TEXT NOT NULL DEFAULT 'small',
  notes TEXT,
  price NUMERIC,
  distance_km NUMERIC,
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  status TEXT NOT NULL DEFAULT 'pending',
  dispatch_state TEXT NOT NULL DEFAULT 'idle',
  dispatch_wave INTEGER NOT NULL DEFAULT 0,
  proof_photo_url TEXT,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers create deliveries" ON public.deliveries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Participants view deliveries" ON public.deliveries
  FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = driver_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers update own deliveries" ON public.deliveries
  FOR UPDATE TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Drivers update assigned deliveries" ON public.deliveries
  FOR UPDATE TO authenticated USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Admins update deliveries" ON public.deliveries
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_deliveries_customer ON public.deliveries (customer_id, created_at DESC);
CREATE INDEX idx_deliveries_driver ON public.deliveries (driver_id, created_at DESC);
CREATE INDEX idx_deliveries_status ON public.deliveries (status);

-- DELIVERY OFFERS
CREATE TABLE public.delivery_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  driver_user_id UUID NOT NULL,
  wave INTEGER NOT NULL DEFAULT 1,
  distance_km NUMERIC,
  status TEXT NOT NULL DEFAULT 'offered',
  offered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 seconds'),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.delivery_offers TO authenticated;
GRANT ALL ON public.delivery_offers TO service_role;
ALTER TABLE public.delivery_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers view own offers" ON public.delivery_offers
  FOR SELECT TO authenticated USING (auth.uid() = driver_user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers respond to own offers" ON public.delivery_offers
  FOR UPDATE TO authenticated USING (auth.uid() = driver_user_id) WITH CHECK (auth.uid() = driver_user_id);

CREATE INDEX idx_delivery_offers_driver ON public.delivery_offers (driver_user_id, status, expires_at DESC);
CREATE INDEX idx_delivery_offers_delivery ON public.delivery_offers (delivery_id);

-- updated_at triggers
CREATE TRIGGER update_driver_profiles_updated_at BEFORE UPDATE ON public.driver_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_delivery_offers_updated_at BEFORE UPDATE ON public.delivery_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- realtime
ALTER TABLE public.deliveries REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_offers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_offers;