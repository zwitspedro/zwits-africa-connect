
-- 1. Status enum + columns
CREATE TYPE public.provider_verification_status AS ENUM ('unverified','pending','approved','revoked');

ALTER TABLE public.providers
  ADD COLUMN verification_status public.provider_verification_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN id_document_url text,
  ADD COLUMN selfie_url text,
  ADD COLUMN business_doc_url text,
  ADD COLUMN submitted_at timestamptz,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN reviewed_by uuid,
  ADD COLUMN revoke_reason text;

-- New providers default to not available until approved
ALTER TABLE public.providers ALTER COLUMN available SET DEFAULT false;

-- 2. Auto-approve when all docs uploaded
CREATE OR REPLACE FUNCTION public.auto_approve_provider()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.verification_status <> 'revoked'
     AND NEW.id_document_url IS NOT NULL
     AND NEW.selfie_url IS NOT NULL
     AND NEW.business_doc_url IS NOT NULL
     AND NEW.verification_status <> 'approved' THEN
    NEW.verification_status := 'approved';
    NEW.submitted_at := COALESCE(NEW.submitted_at, now());
    NEW.reviewed_at := now();
    NEW.verified := true;
    NEW.available := true;
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_a_auto_approve_provider
  BEFORE INSERT OR UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.auto_approve_provider();

-- 3. Guard: only admins can revoke or un-revoke
CREATE OR REPLACE FUNCTION public.guard_provider_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.verification_status = 'revoked' AND NOT public.has_role(auth.uid(),'admin') THEN
      RAISE EXCEPTION 'Only admins can revoke a provider';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.verification_status = 'revoked' AND OLD.verification_status <> 'revoked'
       AND NOT public.has_role(auth.uid(),'admin') THEN
      RAISE EXCEPTION 'Only admins can revoke a provider';
    END IF;
    IF OLD.verification_status = 'revoked' AND NEW.verification_status <> 'revoked'
       AND NOT public.has_role(auth.uid(),'admin') THEN
      RAISE EXCEPTION 'Only admins can reinstate a revoked provider';
    END IF;
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_b_guard_provider_status
  BEFORE INSERT OR UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.guard_provider_status();

-- 4. Tighten discovery policy
DROP POLICY "Providers viewable by authenticated" ON public.providers;
CREATE POLICY "Approved providers viewable"
ON public.providers FOR SELECT TO authenticated
USING (
  verification_status = 'approved'
  OR user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- 5. Block bookings against unapproved providers
CREATE OR REPLACE FUNCTION public.ensure_provider_approved_for_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.provider_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.providers
    WHERE id = NEW.provider_id AND verification_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Provider is not verified';
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_booking_provider_approved
  BEFORE INSERT OR UPDATE OF provider_id ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.ensure_provider_approved_for_booking();

-- 6. Private storage bucket for verification docs
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-verification', 'provider-verification', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Providers upload own verification docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'provider-verification'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Providers and admins read verification docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'provider-verification'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
);

CREATE POLICY "Providers update own verification docs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'provider-verification'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Providers delete own verification docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'provider-verification'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
