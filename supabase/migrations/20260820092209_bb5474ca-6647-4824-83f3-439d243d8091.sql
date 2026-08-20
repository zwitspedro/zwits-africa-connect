CREATE OR REPLACE FUNCTION public.provider_readiness(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pr RECORD;
  ob RECORD;
  v_profile BOOLEAN; v_services BOOLEAN; v_area BOOLEAN;
  v_docs BOOLEAN; v_payouts BOOLEAN; v_verified BOOLEAN;
  v_missing TEXT[] := ARRAY[]::text[];
BEGIN
  IF NOT (public.is_trusted_writer() OR _user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

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

  IF NOT v_profile  THEN v_missing := array_append(v_missing, 'Complete your business profile and phone number'); END IF;
  IF NOT v_services THEN v_missing := array_append(v_missing, 'Add at least one service you offer'); END IF;
  IF NOT v_area     THEN v_missing := array_append(v_missing, 'Set the area you work in'); END IF;
  IF NOT v_docs     THEN v_missing := array_append(v_missing, 'Upload valid, unexpired verification documents'); END IF;
  IF NOT v_payouts  THEN v_missing := array_append(v_missing, 'Add your payout details'); END IF;
  IF NOT v_verified THEN v_missing := array_append(v_missing, 'Wait for Zwits to approve your account'); END IF;

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
$function$;