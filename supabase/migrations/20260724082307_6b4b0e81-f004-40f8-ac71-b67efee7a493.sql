
-- 1. Scope commission_rates provider policy to provider's own category
DROP POLICY IF EXISTS "Providers can view commission rates" ON public.commission_rates;
CREATE POLICY "Providers view own category commission rates"
  ON public.commission_rates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.user_id = auth.uid() AND p.category = commission_rates.category
  ));

-- 2. Restrict ratings visibility
DROP POLICY IF EXISTS "Ratings viewable by authenticated" ON public.ratings;
CREATE POLICY "Ratings viewable by involved parties"
  ON public.ratings FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.providers p WHERE p.id = ratings.provider_id AND p.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = ratings.booking_id AND b.customer_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- 3. Lock down SECURITY DEFINER functions. Trigger functions don't need EXECUTE from api roles.
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_jobs_completed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_provider_rating() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_provider_booking_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_booking_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_provider_approved_for_booking() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_approve_provider() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_commission_rate_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_provider_status() FROM PUBLIC, anon, authenticated;

-- has_role and get_booking_counterpart_profile are needed by RLS/app; restrict to authenticated only
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.get_booking_counterpart_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_booking_counterpart_profile(uuid) TO authenticated;
