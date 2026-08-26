DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;
REVOKE INSERT ON public.notifications FROM authenticated;