
CREATE TABLE public.provider_document_audits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_user_id uuid NOT NULL,
  doc_key text NOT NULL,
  file_name text,
  file_size bigint,
  mime_type text,
  width integer,
  height integer,
  status text NOT NULL,
  errors text[] NOT NULL DEFAULT '{}',
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pda_user_created ON public.provider_document_audits(provider_user_id, created_at DESC);

GRANT SELECT, INSERT ON public.provider_document_audits TO authenticated;
GRANT ALL ON public.provider_document_audits TO service_role;

ALTER TABLE public.provider_document_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers insert own audit rows"
ON public.provider_document_audits FOR INSERT TO authenticated
WITH CHECK (provider_user_id = auth.uid());

CREATE POLICY "Providers view own audit rows"
ON public.provider_document_audits FOR SELECT TO authenticated
USING (provider_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
