CREATE INDEX IF NOT EXISTS provider_document_audits_status_idx ON public.provider_document_audits (status, created_at DESC);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON public.user_roles (role);