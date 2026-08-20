
-- =====================================================================
-- ZWITS PRODUCTION CORE: money, ledger, disputes, capabilities
-- Additive only. No existing table is dropped or rewritten.
-- =====================================================================

-- ---------- commission tuning (extend existing table) ----------
ALTER TABLE public.commission_rates
  ADD COLUMN IF NOT EXISTS max_fee NUMERIC(12,2);

-- ---------- payments ----------
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  provider TEXT,
  external_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','paid','failed','cancelled','refunded')),
  failure_reason TEXT,
  metadata JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payments_one_subject CHECK (num_nonnulls(booking_id, delivery_id) = 1)
);
CREATE UNIQUE INDEX payments_booking_uniq  ON public.payments(booking_id)  WHERE booking_id IS NOT NULL;
CREATE UNIQUE INDEX payments_delivery_uniq ON public.payments(delivery_id) WHERE delivery_id IS NOT NULL;
CREATE INDEX payments_customer_idx ON public.payments(customer_id, created_at DESC);
CREATE INDEX payments_status_idx   ON public.payments(status, created_at DESC);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view payments" ON public.payments FOR SELECT TO authenticated
USING (
  customer_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.bookings b JOIN public.providers p ON p.id = b.provider_id
             WHERE b.id = payments.booking_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.deliveries d
             WHERE d.id = payments.delivery_id AND d.driver_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- provider wallets ----------
CREATE TABLE public.provider_wallets (
  provider_user_id UUID PRIMARY KEY,
  available_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_balance   NUMERIC(12,2) NOT NULL DEFAULT 0,
  lifetime_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.provider_wallets TO authenticated;
GRANT ALL ON public.provider_wallets TO service_role;
ALTER TABLE public.provider_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers view own wallet" ON public.provider_wallets FOR SELECT TO authenticated
USING (provider_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER provider_wallets_updated_at BEFORE UPDATE ON public.provider_wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- immutable ledger ----------
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_user_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
  withdrawal_id UUID REFERENCES public.provider_withdrawals(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('job_earning','commission','withdrawal','refund','adjustment')),
  amount NUMERIC(12,2) NOT NULL,
  balance_before NUMERIC(12,2) NOT NULL,
  balance_after  NUMERIC(12,2) NOT NULL,
  reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','reversed')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX wallet_tx_reference_uniq ON public.wallet_transactions(reference);
CREATE INDEX wallet_tx_provider_idx ON public.wallet_transactions(provider_user_id, created_at DESC);

GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers view own ledger" ON public.wallet_transactions FOR SELECT TO authenticated
USING (provider_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- The ledger is append-only forever, including for admins and service_role.
CREATE OR REPLACE FUNCTION public.wallet_transactions_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'wallet_transactions is an immutable ledger; post a reversing entry instead';
END;
$$;
CREATE TRIGGER wallet_transactions_no_mutate
BEFORE UPDATE OR DELETE ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.wallet_transactions_immutable();

-- ---------- withdrawals: link to ledger ----------
ALTER TABLE public.provider_withdrawals
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- ---------- disputes ----------
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','rejected')),
  resolution TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT disputes_one_subject CHECK (num_nonnulls(booking_id, delivery_id) = 1)
);
CREATE INDEX disputes_status_idx ON public.disputes(status, created_at DESC);
CREATE INDEX disputes_booking_idx ON public.disputes(booking_id);

GRANT SELECT, INSERT ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view disputes" ON public.disputes FOR SELECT TO authenticated
USING (
  opened_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.bookings b LEFT JOIN public.providers p ON p.id = b.provider_id
             WHERE b.id = disputes.booking_id AND (b.customer_id = auth.uid() OR p.user_id = auth.uid()))
  OR EXISTS (SELECT 1 FROM public.deliveries d
             WHERE d.id = disputes.delivery_id AND (d.customer_id = auth.uid() OR d.driver_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Participants open disputes" ON public.disputes FOR INSERT TO authenticated
WITH CHECK (
  opened_by = auth.uid()
  AND (
    EXISTS (SELECT 1 FROM public.bookings b LEFT JOIN public.providers p ON p.id = b.provider_id
            WHERE b.id = disputes.booking_id AND (b.customer_id = auth.uid() OR p.user_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.deliveries d
               WHERE d.id = disputes.delivery_id AND (d.customer_id = auth.uid() OR d.driver_id = auth.uid()))
  )
);

CREATE POLICY "Admins resolve disputes" ON public.disputes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER disputes_updated_at BEFORE UPDATE ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- favourites ----------
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, provider_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage own favourites" ON public.favorites FOR SELECT TO authenticated
USING (customer_id = auth.uid());
CREATE POLICY "Customers add favourites" ON public.favorites FOR INSERT TO authenticated
WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Customers remove favourites" ON public.favorites FOR DELETE TO authenticated
USING (customer_id = auth.uid());

-- ---------- services catalogue ----------
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon, authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views active services" ON public.services FOR SELECT TO anon, authenticated
USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage services" ON public.services FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- provider capabilities (one provider, many services) ----------
CREATE TABLE public.provider_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  pricing_model TEXT NOT NULL DEFAULT 'hourly' CHECK (pricing_model IN ('hourly','fixed','per_km','quote')),
  base_price NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, service_id)
);
CREATE INDEX provider_services_service_idx ON public.provider_services(service_id) WHERE active;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_services TO authenticated;
GRANT SELECT ON public.provider_services TO anon;
GRANT ALL ON public.provider_services TO service_role;
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views approved provider services" ON public.provider_services FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.providers p
               WHERE p.id = provider_services.provider_id AND p.verification_status = 'approved'));
CREATE POLICY "Providers manage own services" ON public.provider_services FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_services.provider_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_services.provider_id AND p.user_id = auth.uid()));

CREATE TRIGGER provider_services_updated_at BEFORE UPDATE ON public.provider_services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- service areas ----------
CREATE TABLE public.service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  radius_km NUMERIC(6,2) NOT NULL DEFAULT 10,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX service_areas_provider_idx ON public.service_areas(provider_id) WHERE active;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_areas TO authenticated;
GRANT ALL ON public.service_areas TO service_role;
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers manage own service areas" ON public.service_areas FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = service_areas.provider_id AND p.user_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = service_areas.provider_id AND p.user_id = auth.uid()));

CREATE TRIGGER service_areas_updated_at BEFORE UPDATE ON public.service_areas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- provider documents ----------
CREATE TABLE public.provider_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_user_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  expiry_date DATE,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','approved','rejected','expired')),
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_user_id, document_type)
);
CREATE INDEX provider_documents_status_idx ON public.provider_documents(verification_status);

GRANT SELECT, INSERT, UPDATE ON public.provider_documents TO authenticated;
GRANT ALL ON public.provider_documents TO service_role;
ALTER TABLE public.provider_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers view own documents" ON public.provider_documents FOR SELECT TO authenticated
USING (provider_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Providers upload own documents" ON public.provider_documents FOR INSERT TO authenticated
WITH CHECK (provider_user_id = auth.uid());
CREATE POLICY "Providers replace own documents" ON public.provider_documents FOR UPDATE TO authenticated
USING (provider_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (provider_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- A provider may never set their own document verification outcome.
CREATE OR REPLACE FUNCTION public.provider_document_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_trusted_writer() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.provider_user_id := auth.uid();
    NEW.verification_status := 'pending';
    NEW.rejection_reason := NULL;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
  ELSE
    NEW.provider_user_id := OLD.provider_user_id;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    IF NEW.file_url IS DISTINCT FROM OLD.file_url THEN
      NEW.verification_status := 'pending';
      NEW.rejection_reason := NULL;
    ELSE
      NEW.verification_status := OLD.verification_status;
      NEW.rejection_reason := OLD.rejection_reason;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER provider_documents_guard BEFORE INSERT OR UPDATE ON public.provider_documents
FOR EACH ROW EXECUTE FUNCTION public.provider_document_guard();
CREATE TRIGGER provider_documents_updated_at BEFORE UPDATE ON public.provider_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- admin audit log ----------
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor UUID,
  action TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_log_created_idx ON public.admin_audit_log(created_at DESC);

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit log" ON public.admin_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action TEXT, _subject_type TEXT, _subject_id UUID DEFAULT NULL, _metadata JSONB DEFAULT NULL
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.admin_audit_log (actor, action, subject_type, subject_id, metadata)
  VALUES (auth.uid(), _action, _subject_type, _subject_id, _metadata);
$$;

-- =====================================================================
-- MONEY MOVEMENT: commission + idempotent ledger posting
-- =====================================================================

CREATE OR REPLACE FUNCTION public.calc_commission(_category TEXT, _amount NUMERIC)
RETURNS NUMERIC LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; fee NUMERIC;
BEGIN
  SELECT percent, min_fee, max_fee INTO r
  FROM public.commission_rates WHERE category = _category AND active LIMIT 1;

  IF NOT FOUND THEN
    SELECT percent, min_fee, max_fee INTO r
    FROM public.commission_rates WHERE category = 'default' AND active LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    fee := round(_amount * 0.15, 2);
  ELSE
    fee := round(_amount * (r.percent / 100.0), 2);
    IF r.min_fee IS NOT NULL AND fee < r.min_fee THEN fee := r.min_fee; END IF;
    IF r.max_fee IS NOT NULL AND fee > r.max_fee THEN fee := r.max_fee; END IF;
  END IF;

  IF fee > _amount THEN fee := _amount; END IF;
  IF fee < 0 THEN fee := 0; END IF;
  RETURN fee;
END;
$$;

-- Posts one immutable ledger entry and moves the wallet under a row lock.
-- `_reference` makes every post idempotent.
CREATE OR REPLACE FUNCTION public.post_wallet_transaction(
  _provider_user_id UUID,
  _type TEXT,
  _amount NUMERIC,
  _reference TEXT,
  _booking_id UUID DEFAULT NULL,
  _delivery_id UUID DEFAULT NULL,
  _withdrawal_id UUID DEFAULT NULL,
  _note TEXT DEFAULT NULL,
  _allow_negative BOOLEAN DEFAULT false
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_before NUMERIC;
  v_after  NUMERIC;
  v_id UUID;
BEGIN
  IF NOT public.is_trusted_writer() THEN
    RAISE EXCEPTION 'Wallet movements are performed by the platform only';
  END IF;

  SELECT id INTO v_id FROM public.wallet_transactions WHERE reference = _reference;
  IF FOUND THEN RETURN v_id; END IF;

  INSERT INTO public.provider_wallets (provider_user_id)
  VALUES (_provider_user_id) ON CONFLICT (provider_user_id) DO NOTHING;

  SELECT available_balance INTO v_before
  FROM public.provider_wallets WHERE provider_user_id = _provider_user_id FOR UPDATE;

  v_after := v_before + _amount;
  IF v_after < 0 AND NOT _allow_negative THEN
    RAISE EXCEPTION 'Insufficient balance: available %, requested %', v_before, abs(_amount);
  END IF;

  UPDATE public.provider_wallets
     SET available_balance = v_after,
         lifetime_earnings = lifetime_earnings + GREATEST(_amount, 0) * (CASE WHEN _type = 'job_earning' THEN 1 ELSE 0 END)
   WHERE provider_user_id = _provider_user_id;

  INSERT INTO public.wallet_transactions
    (provider_user_id, booking_id, delivery_id, withdrawal_id, type, amount, balance_before, balance_after, reference, note)
  VALUES
    (_provider_user_id, _booking_id, _delivery_id, _withdrawal_id, _type, _amount, v_before, v_after, _reference, _note)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Settles a completed, paid booking: commission out, provider earnings in.
-- Idempotent: safe to call repeatedly, credits exactly once.
CREATE OR REPLACE FUNCTION public.settle_booking(_booking_id UUID)
RETURNS TABLE(gross NUMERIC, commission NUMERIC, provider_earnings NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b RECORD;
  p RECORD;
  v_gross NUMERIC;
  v_comm  NUMERIC;
  v_net   NUMERIC;
BEGIN
  IF NOT public.is_trusted_writer() THEN
    RAISE EXCEPTION 'Settlement is performed by the platform only';
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF b.status <> 'completed' THEN RAISE EXCEPTION 'Booking is not completed'; END IF;
  IF b.provider_id IS NULL THEN RAISE EXCEPTION 'Booking has no provider'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payments WHERE booking_id = _booking_id AND status = 'paid') THEN
    RAISE EXCEPTION 'Payment for this booking is not confirmed';
  END IF;

  SELECT user_id INTO p FROM public.providers WHERE id = b.provider_id;

  v_gross := COALESCE(b.price, b.budget, 0);
  v_comm  := public.calc_commission(b.category, v_gross);
  v_net   := v_gross - v_comm;

  PERFORM public.post_wallet_transaction(
    p.user_id, 'job_earning', v_net, 'booking:' || _booking_id || ':earning',
    _booking_id, NULL, NULL, 'Earnings for ' || b.category);

  PERFORM public.post_wallet_transaction(
    p.user_id, 'commission', 0, 'booking:' || _booking_id || ':commission',
    _booking_id, NULL, NULL, 'Zwits commission ' || v_comm::text || ' retained from ' || v_gross::text);

  INSERT INTO public.notifications (user_id, title, body, link, kind)
  VALUES (p.user_id, 'Earnings credited',
          'Your wallet was credited for a completed ' || b.category || ' job.',
          '/provider/dashboard', 'earnings_credited')
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT v_gross, v_comm, v_net;
END;
$$;

-- ---------- server-calculated provider readiness ----------
CREATE OR REPLACE FUNCTION public.provider_readiness(_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pr RECORD;
  ob RECORD;
  v_profile BOOLEAN; v_services BOOLEAN; v_area BOOLEAN;
  v_docs BOOLEAN; v_payouts BOOLEAN; v_verified BOOLEAN;
  v_missing TEXT[] := '{}';
BEGIN
  SELECT * INTO pr FROM public.providers WHERE user_id = _user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('provider_ready', false, 'missing', to_jsonb(ARRAY['Create your provider profile']));
  END IF;
  SELECT * INTO ob FROM public.provider_onboarding WHERE user_id = _user_id;

  v_profile := pr.business_name IS NOT NULL AND pr.city IS NOT NULL
               AND EXISTS (SELECT 1 FROM public.profiles pf WHERE pf.user_id = _user_id AND pf.phone IS NOT NULL);
  v_services := pr.category IS NOT NULL
                OR EXISTS (SELECT 1 FROM public.provider_services ps WHERE ps.provider_id = pr.id AND ps.active);
  v_area := EXISTS (SELECT 1 FROM public.service_areas sa WHERE sa.provider_id = pr.id AND sa.active)
            OR COALESCE(ob.max_travel_km, 0) > 0;
  v_docs := pr.id_document_url IS NOT NULL AND pr.selfie_url IS NOT NULL AND pr.business_doc_url IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM public.provider_documents d
                            WHERE d.provider_user_id = _user_id
                              AND (d.verification_status = 'rejected'
                                   OR (d.expiry_date IS NOT NULL AND d.expiry_date < current_date)));
  v_payouts := COALESCE(ob.payout_method, '') <> '';
  v_verified := pr.verification_status = 'approved';

  IF NOT v_profile  THEN v_missing := v_missing || 'Complete your business profile and phone number'; END IF;
  IF NOT v_services THEN v_missing := v_missing || 'Add at least one service you offer'; END IF;
  IF NOT v_area     THEN v_missing := v_missing || 'Set the area you work in'; END IF;
  IF NOT v_docs     THEN v_missing := v_missing || 'Upload valid, unexpired verification documents'; END IF;
  IF NOT v_payouts  THEN v_missing := v_missing || 'Add your payout details'; END IF;
  IF NOT v_verified THEN v_missing := v_missing || 'Wait for Zwits to approve your account'; END IF;

  RETURN jsonb_build_object(
    'profile_complete', v_profile,
    'services_complete', v_services,
    'service_area_complete', v_area,
    'documents_complete', v_docs,
    'payouts_complete', v_payouts,
    'verified', v_verified,
    'provider_ready', v_profile AND v_services AND v_area AND v_docs AND v_payouts AND v_verified,
    'missing', to_jsonb(v_missing)
  );
END;
$$;

-- ---------- indexes for the hot paths ----------
CREATE INDEX IF NOT EXISTS bookings_dispatch_idx ON public.bookings(dispatch_state, created_at DESC)
  WHERE provider_id IS NULL;
CREATE INDEX IF NOT EXISTS messages_booking_idx ON public.messages(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS job_offers_expiry_idx ON public.job_offers(expires_at) WHERE status = 'offered';
CREATE INDEX IF NOT EXISTS provider_withdrawals_status_idx ON public.provider_withdrawals(status, created_at DESC);

-- ---------- seed the services catalogue from the live categories ----------
INSERT INTO public.services (slug, name, description, active)
SELECT DISTINCT category, initcap(replace(category, '-', ' ')), NULL, true
FROM public.commission_rates
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.services (slug, name, active) VALUES
  ('delivery', 'Delivery', true)
ON CONFLICT (slug) DO NOTHING;

-- Backfill wallets so every existing provider has one.
INSERT INTO public.provider_wallets (provider_user_id)
SELECT user_id FROM public.providers
ON CONFLICT (provider_user_id) DO NOTHING;
