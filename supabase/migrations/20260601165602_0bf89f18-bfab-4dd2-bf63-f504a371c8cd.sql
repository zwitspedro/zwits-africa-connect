ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

CREATE TABLE IF NOT EXISTS public.provider_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider_user_id uuid NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  heading double precision,
  speed double precision,
  accuracy double precision,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (provider_user_id, booking_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_locations TO authenticated;
GRANT ALL ON public.provider_locations TO service_role;

ALTER TABLE public.provider_locations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_provider_locations_booking_id
  ON public.provider_locations (booking_id);

CREATE INDEX IF NOT EXISTS idx_provider_locations_provider_user_id
  ON public.provider_locations (provider_user_id);

CREATE POLICY "Customers and assigned providers view tracking"
ON public.provider_locations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    LEFT JOIN public.providers p ON p.id = b.provider_id
    WHERE b.id = provider_locations.booking_id
      AND (
        b.customer_id = auth.uid()
        OR provider_locations.provider_user_id = auth.uid()
        OR p.user_id = auth.uid()
      )
  )
);

CREATE POLICY "Assigned providers create tracking"
ON public.provider_locations
FOR INSERT
TO authenticated
WITH CHECK (
  provider_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.providers p ON p.id = b.provider_id
    WHERE b.id = provider_locations.booking_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Assigned providers update own tracking"
ON public.provider_locations
FOR UPDATE
TO authenticated
USING (
  provider_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.providers p ON p.id = b.provider_id
    WHERE b.id = provider_locations.booking_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  provider_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.providers p ON p.id = b.provider_id
    WHERE b.id = provider_locations.booking_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Assigned providers delete own tracking"
ON public.provider_locations
FOR DELETE
TO authenticated
USING (
  provider_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.providers p ON p.id = b.provider_id
    WHERE b.id = provider_locations.booking_id
      AND p.user_id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS update_provider_locations_updated_at ON public.provider_locations;
CREATE TRIGGER update_provider_locations_updated_at
BEFORE UPDATE ON public.provider_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.provider_locations REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_locations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;