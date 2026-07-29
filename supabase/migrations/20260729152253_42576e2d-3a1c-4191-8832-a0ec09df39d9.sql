DROP POLICY IF EXISTS "Providers manage own quotes" ON public.job_quotes;

CREATE POLICY "Providers view own quotes"
ON public.job_quotes
FOR SELECT
TO authenticated
USING (provider_user_id = auth.uid());