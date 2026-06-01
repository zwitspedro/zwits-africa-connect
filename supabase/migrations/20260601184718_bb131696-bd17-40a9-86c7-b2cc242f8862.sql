
REVOKE EXECUTE ON FUNCTION public.auto_approve_provider() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_provider_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_provider_approved_for_booking() FROM PUBLIC, anon, authenticated;
