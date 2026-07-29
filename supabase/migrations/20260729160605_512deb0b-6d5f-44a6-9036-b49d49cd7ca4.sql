CREATE POLICY "Users add own non-admin roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role <> 'admin'::public.app_role);

CREATE POLICY "Users remove own non-admin roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND role <> 'admin'::public.app_role);

GRANT INSERT, DELETE ON public.user_roles TO authenticated;