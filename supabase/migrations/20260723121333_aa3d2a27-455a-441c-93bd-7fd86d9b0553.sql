
-- 1. Profiles: restrict SELECT to owner; expose counterpart info via a security-definer RPC
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Security-definer function: return safe counterpart info only when the caller
-- shares a booking with the target user.
CREATE OR REPLACE FUNCTION public.get_booking_counterpart_profile(_user_id uuid)
RETURNS TABLE (display_name text, avatar_url text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.display_name, p.avatar_url, p.phone
  FROM public.profiles p
  WHERE p.user_id = _user_id
    AND (
      -- caller is the customer on a booking with a provider owned by _user_id
      EXISTS (
        SELECT 1
        FROM public.bookings b
        JOIN public.providers pr ON pr.id = b.provider_id
        WHERE b.customer_id = auth.uid()
          AND pr.user_id = _user_id
      )
      OR
      -- caller is the provider (owner of a provider row) on a booking with customer = _user_id
      EXISTS (
        SELECT 1
        FROM public.bookings b
        JOIN public.providers pr ON pr.id = b.provider_id
        WHERE b.customer_id = _user_id
          AND pr.user_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
    );
$$;

REVOKE ALL ON FUNCTION public.get_booking_counterpart_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booking_counterpart_profile(uuid) TO authenticated;

-- 2. Commission rates: restrict SELECT to admins and providers only
DROP POLICY IF EXISTS "Commission rates viewable by authenticated" ON public.commission_rates;

CREATE POLICY "Admins can view commission rates"
  ON public.commission_rates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Providers can view commission rates"
  ON public.commission_rates FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.providers WHERE user_id = auth.uid()));
