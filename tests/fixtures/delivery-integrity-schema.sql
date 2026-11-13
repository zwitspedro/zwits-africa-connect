-- Schema-only snapshot for isolated regression testing; contains no genuine rows.
CREATE SCHEMA auth; CREATE SCHEMA storage; DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$; DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$; DO $$ BEGIN CREATE ROLE service_role; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'authenticated') $$;
CREATE TYPE app_role AS ENUM ('customer','provider','admin','driver','business');
CREATE TYPE booking_status AS ENUM ('pending','accepted','travelling','arrived','in_progress','completed','cancelled','matching','offered','provider_arriving','disputed','refunded');
CREATE TYPE provider_verification_status AS ENUM ('unverified','pending','approved','revoked');
CREATE TABLE storage.objects(bucket_id text,name text,owner uuid,owner_id text,created_at timestamptz DEFAULT now(),metadata jsonb);
CREATE TABLE public.admin_audit_log(id uuid NOT NULL DEFAULT gen_random_uuid(),actor uuid,action text NOT NULL,subject_type text NOT NULL,subject_id uuid,metadata jsonb,created_at timestamp with time zone NOT NULL DEFAULT now(),PRIMARY KEY (id));
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.admin_job_changes(id uuid NOT NULL DEFAULT gen_random_uuid(),kind text NOT NULL,job_id uuid NOT NULL,actor uuid NOT NULL,customer_id uuid NOT NULL,assignee_user_id uuid,reason text NOT NULL,before_values jsonb NOT NULL,proposed_values jsonb NOT NULL,expected_updated_at timestamp with time zone NOT NULL,status text NOT NULL DEFAULT 'pending_customer'::text,customer_decided_at timestamp with time zone,assignee_decided_at timestamp with time zone,created_at timestamp with time zone NOT NULL DEFAULT now(),CHECK ((kind = ANY (ARRAY['booking'::text, 'delivery'::text]))),PRIMARY KEY (id),CHECK ((status = ANY (ARRAY['pending_customer'::text, 'pending_assignee'::text, 'applied'::text, 'rejected'::text, 'withdrawn'::text]))));
ALTER TABLE public.admin_job_changes ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.admin_job_controls(kind text NOT NULL,job_id uuid NOT NULL,held boolean NOT NULL DEFAULT false,hold_reason text,manual_dispatch boolean NOT NULL DEFAULT false,updated_at timestamp with time zone NOT NULL DEFAULT now(),priority text NOT NULL DEFAULT 'normal'::text,CHECK ((kind = ANY (ARRAY['booking'::text, 'delivery'::text]))),PRIMARY KEY (kind, job_id),CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))));
ALTER TABLE public.admin_job_controls ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.bookings(id uuid NOT NULL DEFAULT gen_random_uuid(),customer_id uuid NOT NULL,provider_id uuid,category text NOT NULL,description text,address text NOT NULL,scheduled_for timestamp with time zone,status booking_status NOT NULL DEFAULT 'pending'::booking_status,price numeric(10,2),created_at timestamp with time zone NOT NULL DEFAULT now(),updated_at timestamp with time zone NOT NULL DEFAULT now(),lat double precision,lng double precision,payment_method text,payment_reference text,payment_status text NOT NULL DEFAULT 'pending'::text,budget numeric,photos text[] NOT NULL DEFAULT '{}'::text[],fulfilment_mode text NOT NULL DEFAULT 'dispatch'::text,dispatch_state text NOT NULL DEFAULT 'idle'::text,dispatch_wave integer NOT NULL DEFAULT 0,dispatch_radius_km numeric NOT NULL DEFAULT 5,dispatch_updated_at timestamp with time zone,customer_confirmed_at timestamp with time zone,completed_at timestamp with time zone,contact_phone text,location_notes text,scheduled_until timestamp with time zone,PRIMARY KEY (id));
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.commission_rates(id uuid NOT NULL DEFAULT gen_random_uuid(),category text NOT NULL,percent numeric(5,2) NOT NULL DEFAULT 0,min_fee numeric(10,2) NOT NULL DEFAULT 0,notes text,active boolean NOT NULL DEFAULT true,updated_by uuid,created_at timestamp with time zone NOT NULL DEFAULT now(),updated_at timestamp with time zone NOT NULL DEFAULT now(),max_fee numeric(12,2),UNIQUE (category),CHECK ((min_fee >= (0)::numeric)),CHECK (((percent >= (0)::numeric) AND (percent <= (100)::numeric))),PRIMARY KEY (id));
ALTER TABLE public.commission_rates ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.deliveries(id uuid NOT NULL DEFAULT gen_random_uuid(),customer_id uuid NOT NULL,driver_id uuid,service_tier text NOT NULL DEFAULT 'express_bike'::text,pickup_address text NOT NULL,pickup_lat double precision,pickup_lng double precision,dropoff_address text NOT NULL,dropoff_lat double precision,dropoff_lng double precision,recipient_name text,recipient_phone text,parcel_size text NOT NULL DEFAULT 'small'::text,notes text,price numeric,distance_km numeric,payment_method text,payment_status text NOT NULL DEFAULT 'unpaid'::text,status text NOT NULL DEFAULT 'pending'::text,dispatch_state text NOT NULL DEFAULT 'idle'::text,dispatch_wave integer NOT NULL DEFAULT 0,proof_photo_url text,picked_up_at timestamp with time zone,delivered_at timestamp with time zone,created_at timestamp with time zone NOT NULL DEFAULT now(),updated_at timestamp with time zone NOT NULL DEFAULT now(),location_notes text,scheduled_for timestamp with time zone,scheduled_until timestamp with time zone,duration_minutes integer,duration_basis text,duration_recorded_by uuid,duration_recorded_at timestamp with time zone,CHECK (((duration_minutes >= 1) AND (duration_minutes <= 10080))),PRIMARY KEY (id));
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.delivery_events(id uuid NOT NULL DEFAULT gen_random_uuid(),delivery_id uuid NOT NULL,event text NOT NULL,actor uuid,metadata jsonb,dedupe_key text,created_at timestamp with time zone NOT NULL DEFAULT now(),PRIMARY KEY (id));
ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.delivery_offers(id uuid NOT NULL DEFAULT gen_random_uuid(),delivery_id uuid NOT NULL,driver_user_id uuid NOT NULL,wave integer NOT NULL DEFAULT 1,distance_km numeric,status text NOT NULL DEFAULT 'offered'::text,offered_at timestamp with time zone NOT NULL DEFAULT now(),expires_at timestamp with time zone NOT NULL DEFAULT (now() + '00:00:30'::interval),responded_at timestamp with time zone,created_at timestamp with time zone NOT NULL DEFAULT now(),updated_at timestamp with time zone NOT NULL DEFAULT now(),PRIMARY KEY (id));
ALTER TABLE public.delivery_offers ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.delivery_reassignments(id uuid NOT NULL DEFAULT gen_random_uuid(),delivery_id uuid NOT NULL,action_key uuid NOT NULL,actor uuid NOT NULL,previous_driver uuid NOT NULL,replacement_driver uuid NOT NULL,reason text NOT NULL,status text NOT NULL DEFAULT 'awaiting_replacement'::text,requires_handover boolean NOT NULL,handover_location text,previous_ack_at timestamp with time zone,replacement_ack_at timestamp with time zone,accepted_at timestamp with time zone,handover_at timestamp with time zone,created_at timestamp with time zone NOT NULL DEFAULT now(),decided_at timestamp with time zone,UNIQUE (action_key),CHECK ((previous_driver <> replacement_driver)),PRIMARY KEY (id),CHECK (((length(TRIM(BOTH FROM reason)) >= 5) AND (length(TRIM(BOTH FROM reason)) <= 1000))),CHECK ((status = ANY (ARRAY['awaiting_replacement'::text, 'awaiting_handover'::text, 'completed'::text, 'rejected'::text, 'withdrawn'::text]))));
ALTER TABLE public.delivery_reassignments ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.driver_profiles(id uuid NOT NULL DEFAULT gen_random_uuid(),user_id uuid NOT NULL,full_name text,phone text,city text NOT NULL DEFAULT 'Harare'::text,zone_radius_km numeric NOT NULL DEFAULT 10,available boolean NOT NULL DEFAULT false,licence_url text,id_document_url text,vehicle_doc_url text,verification_status text NOT NULL DEFAULT 'unverified'::text,submitted_at timestamp with time zone,reviewed_at timestamp with time zone,deliveries_completed integer NOT NULL DEFAULT 0,rating_avg numeric(3,2) NOT NULL DEFAULT 0,ratings_count integer NOT NULL DEFAULT 0,created_at timestamp with time zone NOT NULL DEFAULT now(),updated_at timestamp with time zone NOT NULL DEFAULT now(),address text,services text[] NOT NULL DEFAULT '{}'::text[],work_start text,work_end text,insurance_provider text,insurance_expiry date,onboarding_completed_at timestamp with time zone,verification_application_id uuid,PRIMARY KEY (id),UNIQUE (user_id));
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.driver_verification_applications(id uuid NOT NULL DEFAULT gen_random_uuid(),driver_profile_id uuid NOT NULL,user_id uuid NOT NULL,details jsonb NOT NULL,document_paths jsonb NOT NULL,vehicle_snapshot jsonb NOT NULL,status text NOT NULL DEFAULT 'pending'::text,review_reason text,reviewed_by uuid,submitted_at timestamp with time zone NOT NULL DEFAULT now(),reviewed_at timestamp with time zone,PRIMARY KEY (id),CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))));
ALTER TABLE public.driver_verification_applications ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.job_offers(id uuid NOT NULL DEFAULT gen_random_uuid(),booking_id uuid NOT NULL,provider_id uuid NOT NULL,provider_user_id uuid NOT NULL,wave integer NOT NULL DEFAULT 1,distance_km numeric,status text NOT NULL DEFAULT 'offered'::text,offered_at timestamp with time zone NOT NULL DEFAULT now(),expires_at timestamp with time zone NOT NULL,responded_at timestamp with time zone,created_at timestamp with time zone NOT NULL DEFAULT now(),updated_at timestamp with time zone NOT NULL DEFAULT now(),UNIQUE (booking_id, provider_id),PRIMARY KEY (id));
ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.notifications(id uuid NOT NULL DEFAULT gen_random_uuid(),user_id uuid NOT NULL,title text NOT NULL,body text,link text,kind text NOT NULL DEFAULT 'info'::text,read_at timestamp with time zone,created_at timestamp with time zone NOT NULL DEFAULT now(),PRIMARY KEY (id));
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.payments(id uuid NOT NULL DEFAULT gen_random_uuid(),booking_id uuid,delivery_id uuid,customer_id uuid NOT NULL,amount numeric(12,2) NOT NULL,currency text NOT NULL DEFAULT 'USD'::text,payment_method text NOT NULL DEFAULT 'cash'::text,provider text,external_reference text,status text NOT NULL DEFAULT 'pending'::text,failure_reason text,metadata jsonb,paid_at timestamp with time zone,created_at timestamp with time zone NOT NULL DEFAULT now(),updated_at timestamp with time zone NOT NULL DEFAULT now(),CHECK ((amount >= (0)::numeric)),CHECK ((num_nonnulls(booking_id, delivery_id) = 1)),PRIMARY KEY (id),CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'paid'::text, 'failed'::text, 'cancelled'::text, 'refunded'::text]))));
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.profiles(id uuid NOT NULL DEFAULT gen_random_uuid(),user_id uuid NOT NULL,display_name text,phone text,avatar_url text,account_type text NOT NULL DEFAULT 'customer'::text,created_at timestamp with time zone NOT NULL DEFAULT now(),updated_at timestamp with time zone NOT NULL DEFAULT now(),country text,city text,referral_code text,terms_accepted_at timestamp with time zone,PRIMARY KEY (id),UNIQUE (user_id));
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.provider_availability(id uuid NOT NULL DEFAULT gen_random_uuid(),user_id uuid NOT NULL,weekday smallint NOT NULL,enabled boolean NOT NULL DEFAULT true,start_time time without time zone NOT NULL DEFAULT '08:00:00'::time without time zone,end_time time without time zone NOT NULL DEFAULT '17:00:00'::time without time zone,created_at timestamp with time zone NOT NULL DEFAULT now(),updated_at timestamp with time zone NOT NULL DEFAULT now(),PRIMARY KEY (id),UNIQUE (user_id, weekday),CHECK (((weekday >= 1) AND (weekday <= 7))));
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.provider_onboarding(id uuid NOT NULL DEFAULT gen_random_uuid(),user_id uuid NOT NULL,national_id text,country text,city text,business_type text,years_experience integer,service_categories text[] NOT NULL DEFAULT '{}'::text[],service_areas text[] NOT NULL DEFAULT '{}'::text[],business_address text,website text,social_handle text,payout_method text,bank_name text,bank_account text,mobile_money_number text,tax_number text,working_days text[] NOT NULL DEFAULT '{}'::text[],work_start text,work_end text,emergency_services boolean NOT NULL DEFAULT false,max_travel_km numeric NOT NULL DEFAULT 20,background_check_consent boolean NOT NULL DEFAULT false,business_reg_url text,certificate_url text,proof_of_address_url text,portfolio_urls text[] NOT NULL DEFAULT '{}'::text[],completed_step integer NOT NULL DEFAULT 1,created_at timestamp with time zone NOT NULL DEFAULT now(),updated_at timestamp with time zone NOT NULL DEFAULT now(),PRIMARY KEY (id),UNIQUE (user_id));
ALTER TABLE public.provider_onboarding ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.provider_services(id uuid NOT NULL DEFAULT gen_random_uuid(),provider_id uuid NOT NULL,service_id uuid NOT NULL,active boolean NOT NULL DEFAULT true,pricing_model text NOT NULL DEFAULT 'hourly'::text,base_price numeric(12,2),created_at timestamp with time zone NOT NULL DEFAULT now(),updated_at timestamp with time zone NOT NULL DEFAULT now(),PRIMARY KEY (id),CHECK ((pricing_model = ANY (ARRAY['hourly'::text, 'fixed'::text, 'per_km'::text, 'quote'::text]))),UNIQUE (provider_id, service_id));
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.provider_time_off(id uuid NOT NULL DEFAULT gen_random_uuid(),user_id uuid NOT NULL,day date NOT NULL,reason text,created_at timestamp with time zone NOT NULL DEFAULT now(),updated_at timestamp with time zone NOT NULL DEFAULT now(),PRIMARY KEY (id),UNIQUE (user_id, day));
ALTER TABLE public.provider_time_off ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.provider_wallets(provider_user_id uuid NOT NULL,available_balance numeric(12,2) NOT NULL DEFAULT 0,pending_balance numeric(12,2) NOT NULL DEFAULT 0,lifetime_earnings numeric(12,2) NOT NULL DEFAULT 0,currency text NOT NULL DEFAULT 'USD'::text,created_at timestamp with time zone NOT NULL DEFAULT now(),updated_at timestamp with time zone NOT NULL DEFAULT now(),PRIMARY KEY (provider_user_id));
ALTER TABLE public.provider_wallets ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.providers(id uuid NOT NULL DEFAULT gen_random_uuid(),user_id uuid NOT NULL,business_name text NOT NULL,category text NOT NULL,bio text,city text NOT NULL,hourly_rate numeric(10,2) NOT NULL DEFAULT 0,verified boolean NOT NULL DEFAULT false,available boolean NOT NULL DEFAULT false,rating_avg numeric(3,2) NOT NULL DEFAULT 0,ratings_count integer NOT NULL DEFAULT 0,jobs_completed integer NOT NULL DEFAULT 0,created_at timestamp with time zone NOT NULL DEFAULT now(),updated_at timestamp with time zone NOT NULL DEFAULT now(),verification_status provider_verification_status NOT NULL DEFAULT 'unverified'::provider_verification_status,id_document_url text,selfie_url text,business_doc_url text,submitted_at timestamp with time zone,reviewed_at timestamp with time zone,reviewed_by uuid,revoke_reason text,onboarding_completed_at timestamp with time zone,PRIMARY KEY (id),UNIQUE (user_id));
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.service_areas(id uuid NOT NULL DEFAULT gen_random_uuid(),provider_id uuid NOT NULL,area text NOT NULL,latitude double precision,longitude double precision,radius_km numeric(6,2) NOT NULL DEFAULT 10,active boolean NOT NULL DEFAULT true,created_at timestamp with time zone NOT NULL DEFAULT now(),updated_at timestamp with time zone NOT NULL DEFAULT now(),PRIMARY KEY (id));
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.services(id uuid NOT NULL DEFAULT gen_random_uuid(),slug text NOT NULL,name text NOT NULL,description text,icon text,active boolean NOT NULL DEFAULT true,created_at timestamp with time zone NOT NULL DEFAULT now(),PRIMARY KEY (id),UNIQUE (slug));
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.user_roles(id uuid NOT NULL DEFAULT gen_random_uuid(),user_id uuid NOT NULL,role app_role NOT NULL,created_at timestamp with time zone NOT NULL DEFAULT now(),PRIMARY KEY (id),UNIQUE (user_id, role));
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.vehicles(id uuid NOT NULL DEFAULT gen_random_uuid(),user_id uuid NOT NULL,vehicle_type text NOT NULL DEFAULT 'bike'::text,make text,model text,colour text,plate text NOT NULL,capacity_kg numeric,active boolean NOT NULL DEFAULT true,created_at timestamp with time zone NOT NULL DEFAULT now(),updated_at timestamp with time zone NOT NULL DEFAULT now(),photo_url text,PRIMARY KEY (id));
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.wallet_transactions(id uuid NOT NULL DEFAULT gen_random_uuid(),provider_user_id uuid NOT NULL,booking_id uuid,delivery_id uuid,withdrawal_id uuid,type text NOT NULL,amount numeric(12,2) NOT NULL,balance_before numeric(12,2) NOT NULL,balance_after numeric(12,2) NOT NULL,reference text NOT NULL,status text NOT NULL DEFAULT 'posted'::text,note text,created_at timestamp with time zone NOT NULL DEFAULT now(),PRIMARY KEY (id),CHECK ((status = ANY (ARRAY['posted'::text, 'reversed'::text]))),CHECK ((type = ANY (ARRAY['job_earning'::text, 'commission'::text, 'withdrawal'::text, 'refund'::text, 'adjustment'::text]))));
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX test_wallet_ref ON wallet_transactions(reference); CREATE UNIQUE INDEX test_payment_delivery ON payments(delivery_id) WHERE delivery_id IS NOT NULL; CREATE UNIQUE INDEX test_payment_booking ON payments(booking_id) WHERE booking_id IS NOT NULL; CREATE UNIQUE INDEX test_event_key ON delivery_events(delivery_id,dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE OR REPLACE FUNCTION public.booking_mutation_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_customer boolean;
  v_is_provider boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.booking_transition_allowed(OLD.status::text, NEW.status::text) THEN
    RAISE EXCEPTION 'Invalid booking status transition % -> %', OLD.status, NEW.status;
  END IF;

  IF public.is_trusted_writer() THEN
    IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status <> 'completed' THEN
      NEW.completed_at := COALESCE(OLD.completed_at, now());
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.customer_id := auth.uid();
    NEW.status := 'pending';
    NEW.payment_status := 'pending';
    NEW.payment_reference := NULL;
    NEW.customer_confirmed_at := NULL;
    NEW.completed_at := NULL;
    RETURN NEW;
  END IF;

  v_is_customer := OLD.customer_id = auth.uid();
  v_is_provider := EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = OLD.provider_id AND p.user_id = auth.uid()
  );

  NEW.customer_id := OLD.customer_id;
  NEW.provider_id := OLD.provider_id;
  NEW.price := OLD.price;
  NEW.payment_status := OLD.payment_status;
  NEW.payment_reference := OLD.payment_reference;
  NEW.customer_confirmed_at := OLD.customer_confirmed_at;
  NEW.dispatch_state := OLD.dispatch_state;
  NEW.dispatch_wave := OLD.dispatch_wave;
  NEW.dispatch_radius_km := OLD.dispatch_radius_km;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF v_is_customer AND NOT v_is_provider THEN
      IF NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'Customers may only cancel an active booking';
      END IF;
    ELSIF v_is_provider THEN
      IF NOT (
        (OLD.status IN ('pending','matching','offered') AND NEW.status = 'cancelled') OR
        (OLD.status = 'accepted'          AND NEW.status IN ('provider_arriving','travelling','cancelled')) OR
        (OLD.status IN ('provider_arriving','travelling') AND NEW.status IN ('arrived','cancelled')) OR
        (OLD.status = 'arrived'           AND NEW.status IN ('in_progress','cancelled')) OR
        (OLD.status = 'in_progress'       AND NEW.status = 'completed')
      ) THEN
        RAISE EXCEPTION 'Invalid booking status transition % -> %', OLD.status, NEW.status;
      END IF;
    ELSE
      RAISE EXCEPTION 'Not a participant on this booking';
    END IF;
  END IF;

  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    NEW.completed_at := COALESCE(OLD.completed_at, now());
  ELSE
    NEW.completed_at := OLD.completed_at;
  END IF;

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.booking_status_canonical(_status text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE _status
    WHEN 'requested' THEN 'pending'
    WHEN 'travelling' THEN 'provider_arriving'
    ELSE _status
  END;
$function$;
CREATE OR REPLACE FUNCTION public.booking_transition_allowed(_old text, _new text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  o text := public.booking_status_canonical(_old);
  n text := public.booking_status_canonical(_new);
BEGIN
  IF o = n THEN RETURN true; END IF;
  RETURN CASE o
    WHEN 'pending'           THEN n IN ('matching','offered','accepted','cancelled')
    WHEN 'matching'          THEN n IN ('offered','accepted','pending','cancelled')
    WHEN 'offered'           THEN n IN ('accepted','matching','pending','cancelled')
    WHEN 'accepted'          THEN n IN ('provider_arriving','cancelled')
    WHEN 'provider_arriving' THEN n IN ('arrived','cancelled')
    WHEN 'arrived'           THEN n IN ('in_progress','cancelled')
    WHEN 'in_progress'       THEN n IN ('completed','cancelled')
    WHEN 'completed'         THEN n IN ('disputed')
    WHEN 'disputed'          THEN n IN ('refunded','completed')
    ELSE false            -- cancelled and refunded are terminal
  END;
END;
$function$;
CREATE OR REPLACE FUNCTION public.bump_jobs_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' AND NEW.provider_id IS NOT NULL THEN
    PERFORM set_config('zwits.trusted', 'on', true);
    UPDATE public.providers
      SET jobs_completed = jobs_completed + 1
      WHERE id = NEW.provider_id;
    PERFORM set_config('zwits.trusted', 'off', true);
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.calc_commission(_category text, _amount numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
CREATE OR REPLACE FUNCTION public.confirm_cash_booking(_booking_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE b public.bookings; uid uuid; payment public.payments; totals record;
BEGIN
 SELECT * INTO b FROM public.bookings WHERE id=_booking_id FOR UPDATE;
 SELECT user_id INTO uid FROM public.providers WHERE id=b.provider_id;
 IF auth.uid() IS NULL OR NOT(coalesce(uid=auth.uid(),false) OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Only the assigned provider can confirm cash'; END IF;
 IF b.status<>'completed' OR b.payment_method IS DISTINCT FROM 'cash' THEN RAISE EXCEPTION 'A completed cash booking is required'; END IF;
 IF coalesce(b.price,b.budget,0)<=0 THEN RAISE EXCEPTION 'This booking has no agreed price yet'; END IF;
 PERFORM set_config('zwits.trusted','on',true);
 SELECT * INTO payment FROM public.payments WHERE booking_id=b.id FOR UPDATE;
 IF FOUND AND (payment.payment_method<>'cash' OR payment.status='refunded' OR payment.amount IS DISTINCT FROM coalesce(b.price,b.budget)) THEN RAISE EXCEPTION 'Payment mismatch; contact support'; END IF;
 IF b.payment_status='paid' AND EXISTS(SELECT 1 FROM public.wallet_transactions WHERE reference='booking:'||b.id||':commission') THEN
  RETURN (SELECT jsonb_build_object('ok',true,'gross',coalesce(b.price,b.budget),'commission',-amount,'providerEarnings',coalesce(b.price,b.budget)+amount) FROM public.wallet_transactions WHERE reference='booking:'||b.id||':commission');
 END IF;
 IF payment.id IS NULL THEN
  INSERT INTO public.payments(booking_id,customer_id,amount,payment_method,provider,status,paid_at) VALUES(b.id,b.customer_id,coalesce(b.price,b.budget),'cash','cash','paid',now());
 ELSE UPDATE public.payments SET status='paid',paid_at=coalesce(paid_at,now()) WHERE id=payment.id; END IF;
 UPDATE public.bookings SET payment_status='paid' WHERE id=b.id;
 SELECT * INTO totals FROM public.settle_booking(b.id);
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(b.customer_id,'Cash payment recorded','Your provider confirmed receipt of cash.','/bookings/'||b.id,'payment_received');
 RETURN jsonb_build_object('ok',true,'gross',totals.gross,'commission',totals.commission,'providerEarnings',totals.provider_earnings);
END $function$;
CREATE OR REPLACE FUNCTION public.confirm_cash_delivery(_delivery_id uuid, _reason text DEFAULT 'Assigned driver confirmed cash received on delivery'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE d public.deliveries; p public.payments; actor uuid:=auth.uid(); t record; already_settled boolean; prior_trust text:=coalesce(current_setting('zwits.trusted',true),'');
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO d FROM public.deliveries WHERE id=_delivery_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
 IF coalesce(d.driver_id=actor,false) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Only the assigned driver can confirm receipt of cash'; END IF;
 IF d.status IS DISTINCT FROM 'delivered' OR d.payment_method IS DISTINCT FROM 'cash' OR coalesce(d.price,0)<=0 THEN RAISE EXCEPTION 'Completed cash delivery with an agreed price required'; END IF;
 IF _reason IS NULL OR length(trim(_reason))<5 OR length(_reason)>500 THEN RAISE EXCEPTION 'Receipt reason required'; END IF;
 IF d.proof_photo_url IS NULL OR d.proof_photo_url !~ ('^'||actor::text||'/'||d.id::text||'/delivery-proof-[0-9a-f-]+\.(jpg|png|webp)$') OR d.picked_up_at IS NULL OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='job-photos' AND o.name=d.proof_photo_url AND (o.owner_id=actor::text OR o.owner=actor) AND o.created_at>=d.picked_up_at AND o.metadata->>'mimetype' IN ('image/jpeg','image/png','image/webp')) THEN RAISE EXCEPTION 'Valid delivery-specific proof required'; END IF;
 SELECT * INTO p FROM public.payments WHERE delivery_id=d.id FOR UPDATE;
 IF FOUND AND (p.customer_id IS DISTINCT FROM d.customer_id OR p.payment_method IS DISTINCT FROM 'cash' OR p.status IN ('refunded','cancelled','failed') OR p.amount IS DISTINCT FROM d.price OR p.currency IS DISTINCT FROM 'USD') THEN RAISE EXCEPTION 'Payment mismatch; contact support'; END IF;
 already_settled:=EXISTS(SELECT 1 FROM public.wallet_transactions WHERE reference='delivery:'||d.id||':commission');
 PERFORM set_config('zwits.trusted','on',true);
 IF p.id IS NULL THEN
  INSERT INTO public.payments(delivery_id,customer_id,amount,currency,payment_method,provider,status,paid_at,metadata) VALUES(d.id,d.customer_id,d.price,'USD','cash','cash','paid',now(),jsonb_build_object('confirmed_by',actor,'reason',trim(_reason)));
 ELSIF p.status<>'paid' THEN
  UPDATE public.payments SET status='paid',paid_at=coalesce(paid_at,now()),failure_reason=NULL,metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('confirmed_by',actor,'reason',trim(_reason)) WHERE id=p.id;
 END IF;
 UPDATE public.deliveries SET payment_status='paid' WHERE id=d.id AND payment_status IS DISTINCT FROM 'paid';
 SELECT * INTO t FROM public.settle_delivery(d.id);
 IF NOT already_settled THEN
  PERFORM public.log_delivery_event(d.id,'cash_receipt_confirmed',actor,jsonb_build_object('reason',trim(_reason),'gross',t.gross,'commission',t.commission,'provider_earnings',t.provider_earnings),'cash_receipt_confirmed');
  INSERT INTO public.admin_audit_log(actor,action,subject_type,subject_id,metadata) VALUES(actor,'delivery_cash_confirmed','delivery',d.id,jsonb_build_object('reason',trim(_reason),'gross',t.gross,'commission',t.commission));
  INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(d.customer_id,'Delivery cash recorded','Your assigned driver confirmed receipt of cash.','/deliveries/'||d.id,'payment_complete');
 END IF;
 PERFORM set_config('zwits.trusted',prior_trust,true);
 RETURN jsonb_build_object('ok',true,'gross',t.gross,'commission',t.commission,'providerEarnings',t.provider_earnings,'unchanged',already_settled);
END $function$;
CREATE OR REPLACE FUNCTION public.delivery_custody_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 IF EXISTS(SELECT 1 FROM public.delivery_reassignments WHERE delivery_id=NEW.id AND status IN ('awaiting_replacement','awaiting_handover')) AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.driver_id IS DISTINCT FROM OLD.driver_id) AND coalesce(current_setting('zwits.custody_transfer',true),'')='' THEN RAISE EXCEPTION 'Resolve the pending driver replacement and custody handover first'; END IF;
 RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.delivery_duration_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ BEGIN
IF TG_OP='INSERT' THEN IF NEW.duration_minutes IS NOT NULL AND NOT public.is_trusted_writer() THEN RAISE EXCEPTION 'Only authorised duration recording is allowed'; END IF;
ELSIF NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes OR NEW.duration_basis IS DISTINCT FROM OLD.duration_basis OR NEW.duration_recorded_by IS DISTINCT FROM OLD.duration_recorded_by OR NEW.duration_recorded_at IS DISTINCT FROM OLD.duration_recorded_at THEN
IF coalesce(current_setting('zwits.duration_recording',true),'')<>'on' THEN RAISE EXCEPTION 'Use authorised duration recording'; END IF;
END IF;
IF NEW.duration_minutes IS NOT NULL THEN
IF length(trim(coalesce(NEW.duration_basis,'')))<5 OR NEW.duration_recorded_at IS NULL OR NEW.duration_recorded_by IS NULL THEN RAISE EXCEPTION 'Duration requires source and recording identity'; END IF;
IF NEW.scheduled_for IS NOT NULL AND (TG_OP='INSERT' OR NEW.scheduled_for IS DISTINCT FROM OLD.scheduled_for OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes) THEN NEW.scheduled_until:=NEW.scheduled_for+make_interval(mins=>NEW.duration_minutes); END IF;
END IF; RETURN NEW; END $function$;
CREATE OR REPLACE FUNCTION public.delivery_mutation_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.delivery_transition_allowed(OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'Invalid delivery status transition % -> %', OLD.status, NEW.status;
  END IF;

  IF public.is_trusted_writer() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.customer_id := auth.uid();
    NEW.driver_id := NULL;
    NEW.status := 'pending';
    NEW.payment_status := 'pending';
    NEW.picked_up_at := NULL;
    NEW.delivered_at := NULL;
    NEW.proof_photo_url := NULL;
    RETURN NEW;
  END IF;

  NEW.customer_id := OLD.customer_id;
  NEW.driver_id := OLD.driver_id;
  NEW.price := OLD.price;
  NEW.distance_km := OLD.distance_km;
  NEW.payment_status := OLD.payment_status;
  NEW.dispatch_state := OLD.dispatch_state;
  NEW.dispatch_wave := OLD.dispatch_wave;
  NEW.proof_photo_url := OLD.proof_photo_url;
  NEW.picked_up_at := OLD.picked_up_at;
  NEW.delivered_at := OLD.delivered_at;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'Delivery status changes are handled by the platform';
    END IF;
    IF auth.uid() NOT IN (COALESCE(OLD.customer_id, '00000000-0000-0000-0000-000000000000'::uuid),
                          COALESCE(OLD.driver_id,   '00000000-0000-0000-0000-000000000000'::uuid)) THEN
      RAISE EXCEPTION 'Not a participant on this delivery';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.delivery_transition_allowed(_old text, _new text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _old = _new THEN RETURN true; END IF;
  RETURN CASE _old
    WHEN 'pending'    THEN _new IN ('matching','offered','accepted','cancelled')
    WHEN 'matching'   THEN _new IN ('offered','accepted','pending','cancelled')
    WHEN 'offered'    THEN _new IN ('accepted','matching','pending','cancelled')
    WHEN 'accepted'   THEN _new IN ('arriving','picked_up','cancelled')
    WHEN 'arriving'   THEN _new IN ('picked_up','cancelled')
    WHEN 'picked_up'  THEN _new IN ('delivered','cancelled')
    WHEN 'delivered'  THEN _new IN ('disputed')
    WHEN 'disputed'   THEN _new IN ('refunded','delivered')
    ELSE false
  END;
END;
$function$;
CREATE OR REPLACE FUNCTION public.dispatch_assignment_check(_kind text, _id uuid, _assignee uuid, _start timestamp with time zone DEFAULT NULL::timestamp with time zone, _end timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE j jsonb; p jsonb; uid uuid; conflicts jsonb:='[]'; n integer; declared_start text; declared_end text; local_start timestamp; local_end timestamp;
BEGIN
 IF NOT public.is_trusted_writer() AND (auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _kind='booking' THEN SELECT to_jsonb(b) INTO j FROM public.bookings b WHERE id=_id; SELECT to_jsonb(pr),pr.user_id INTO p,uid FROM public.providers pr WHERE id=_assignee FOR UPDATE;
 ELSE SELECT to_jsonb(d) INTO j FROM public.deliveries d WHERE id=_id; SELECT to_jsonb(dr),dr.user_id INTO p,uid FROM public.driver_profiles dr WHERE user_id=_assignee FOR UPDATE; END IF;
 IF j IS NULL OR p IS NULL THEN RETURN jsonb_build_object('ok',false,'conflicts',jsonb_build_array(jsonb_build_object('reason','Job or assignee not found'))); END IF;
 _start:=coalesce(_start,(j->>'scheduled_for')::timestamptz); _end:=coalesce(_end,(j->>'scheduled_until')::timestamptz);
 IF p->>'verification_status'<>'approved' OR NOT (p->>'available')::boolean THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Assignee is not approved and online')); END IF;
 IF _end IS NOT NULL AND (_start IS NULL OR _end<=_start) THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Commitment end must be after the scheduled start')); END IF;
 IF _kind='booking' THEN
 IF NOT public.is_provider_available_at(uid,coalesce(_start,now())) OR (_end IS NOT NULL AND NOT public.is_provider_available_at(uid,_end-interval '1 second')) THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Outside declared provider availability')); END IF;
 IF p->>'category'<>j->>'category' AND NOT EXISTS(SELECT 1 FROM public.provider_services ps JOIN public.services s ON s.id=ps.service_id WHERE ps.provider_id=_assignee AND ps.active AND s.slug=j->>'category') THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Provider does not offer this service')); END IF;
 ELSE
 IF p->>'city'<>'Harare' OR p->>'id_document_url' IS NULL OR p->>'licence_url' IS NULL OR p->>'vehicle_doc_url' IS NULL OR NOT EXISTS(SELECT 1 FROM public.vehicles WHERE user_id=uid AND active AND (j->>'service_tier'='express_bike' OR vehicle_type IN ('van','truck'))) THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Driver documents, service area or vehicle are ineligible')); END IF;
 declared_start:=p->>'work_start'; declared_end:=p->>'work_end'; local_start:=coalesce(_start,now()) AT TIME ZONE 'Africa/Harare'; local_end:=coalesce(_end,_start,now()) AT TIME ZONE 'Africa/Harare';
 IF declared_start IS NOT NULL AND declared_end IS NOT NULL AND (local_start::time<declared_start::time OR local_start::time>=declared_end::time OR (_end IS NOT NULL AND (local_end::date<>local_start::date OR local_end::time>declared_end::time))) THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Outside declared driver working hours')); END IF;
 END IF;
 WITH commitments AS (
 SELECT b.id,b.scheduled_for s,b.scheduled_until e,b.status::text status FROM public.bookings b WHERE _kind='booking' AND b.id<>_id AND b.status IN ('pending','matching','offered','accepted','travelling','provider_arriving','arrived','in_progress') AND (b.provider_id=_assignee OR EXISTS(SELECT 1 FROM public.job_offers o JOIN public.admin_job_controls c ON c.kind='booking' AND c.job_id=b.id AND c.manual_dispatch WHERE o.booking_id=b.id AND o.provider_id=_assignee AND o.status='offered' AND o.expires_at>now()))
 UNION ALL SELECT d.id,d.scheduled_for,d.scheduled_until,d.status FROM public.deliveries d WHERE _kind='delivery' AND d.id<>_id AND d.status IN ('pending','matching','offered','accepted','arriving','picked_up') AND (d.driver_id=_assignee OR EXISTS(SELECT 1 FROM public.delivery_offers o JOIN public.admin_job_controls c ON c.kind='delivery' AND c.job_id=d.id AND c.manual_dispatch WHERE o.delivery_id=d.id AND o.driver_user_id=_assignee AND o.status='offered' AND o.expires_at>now()) OR EXISTS(SELECT 1 FROM public.delivery_reassignments r WHERE r.delivery_id=d.id AND r.replacement_driver=_assignee AND r.status IN ('awaiting_replacement','awaiting_handover')))
 ) SELECT count(*),coalesce(jsonb_agg(jsonb_build_object('job',id,'existingStart',s,'existingEnd',e,'proposedStart',_start,'proposedEnd',_end,'reason',CASE WHEN s IS NULL OR _start IS NULL THEN 'Active commitment has no reliable time window' WHEN e IS NULL OR _end IS NULL THEN 'Missing commitment end: overlap cannot be ruled out' ELSE 'Overlapping scheduled commitments' END)) FILTER(WHERE (_start IS NOT NULL OR s IS NOT NULL) AND (s IS NULL OR _start IS NULL OR (coalesce(_end,'infinity'::timestamptz)>s AND coalesce(e,'infinity'::timestamptz)>_start))),'[]'::jsonb) INTO n,conflicts FROM commitments;
 -- Recompute eligibility independently so commitment aggregation never masks it.
 IF p->>'verification_status'<>'approved' OR NOT (p->>'available')::boolean THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Assignee is not approved and online')); END IF;
 IF _end IS NOT NULL AND (_start IS NULL OR _end<=_start) THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Commitment end must follow start')); END IF;
 IF _kind='booking' AND (NOT public.is_provider_available_at(uid,coalesce(_start,now())) OR (_end IS NOT NULL AND NOT public.is_provider_available_at(uid,_end-interval '1 second'))) THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Outside declared provider availability')); END IF;
 IF _kind='booking' AND p->>'category'<>j->>'category' AND NOT EXISTS(SELECT 1 FROM public.provider_services ps JOIN public.services s ON s.id=ps.service_id WHERE ps.provider_id=_assignee AND ps.active AND s.slug=j->>'category') THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Provider does not offer this service')); END IF;
 IF _kind='delivery' AND (p->>'city'<>'Harare' OR p->>'id_document_url' IS NULL OR p->>'licence_url' IS NULL OR p->>'vehicle_doc_url' IS NULL OR NOT EXISTS(SELECT 1 FROM public.vehicles WHERE user_id=uid AND active AND (j->>'service_tier'='express_bike' OR vehicle_type IN ('van','truck')))) THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Driver documents, area or vehicle ineligible')); END IF;
 IF _kind='delivery' AND declared_start IS NOT NULL AND declared_end IS NOT NULL AND (local_start::time<declared_start::time OR local_start::time>=declared_end::time OR (_end IS NOT NULL AND (local_end::date<>local_start::date OR local_end::time>declared_end::time))) THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Outside declared driver working hours')); END IF;
 IF n>=3 THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('reason','Capacity exceeded: active jobs and manual offers reserve all 3 places')); END IF;
 RETURN jsonb_build_object('ok',conflicts='[]'::jsonb,'assignee',_assignee,'name',coalesce(p->>'full_name',p->>'business_name'),'load',n,'capacity',3,'conflicts',conflicts,'proposedStart',_start,'proposedEnd',_end,'limitation',CASE WHEN _start IS NULL THEN 'Unscheduled queue: capacity checked, timing and travel feasibility are not guaranteed' WHEN _end IS NULL THEN 'No reliable commitment end supplied; ambiguous scheduled conflicts are blocked' WHEN _kind='delivery' AND (declared_start IS NULL OR declared_end IS NULL) THEN 'Driver working hours are not declared; interval conflicts and capacity are enforced' ELSE NULL END);
END $function$;
CREATE OR REPLACE FUNCTION public.dispatch_commitment_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE k text; jid uuid; aid uuid; start_at timestamptz; end_at timestamptz; check_result jsonb;
BEGIN
 IF TG_TABLE_NAME IN ('job_offers','delivery_offers') THEN
 IF NEW.status<>'offered' THEN RETURN NEW; END IF;
 k:=CASE WHEN TG_TABLE_NAME='job_offers' THEN 'booking' ELSE 'delivery' END; jid:=(to_jsonb(NEW)->>CASE WHEN k='booking' THEN 'booking_id' ELSE 'delivery_id' END)::uuid; aid:=(to_jsonb(NEW)->>CASE WHEN k='booking' THEN 'provider_id' ELSE 'driver_user_id' END)::uuid;
 ELSE
 k:=CASE WHEN TG_TABLE_NAME='bookings' THEN 'booking' ELSE 'delivery' END; jid:=NEW.id; aid:=(to_jsonb(NEW)->>CASE WHEN k='booking' THEN 'provider_id' ELSE 'driver_id' END)::uuid;
 IF aid IS NULL OR NEW.status::text IN ('completed','delivered','cancelled','refunded','disputed','failed') THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)->>'scheduled_for') IS NOT DISTINCT FROM (to_jsonb(OLD)->>'scheduled_for') AND (to_jsonb(NEW)->>'scheduled_until') IS NOT DISTINCT FROM (to_jsonb(OLD)->>'scheduled_until') AND aid IS NOT DISTINCT FROM (to_jsonb(OLD)->>CASE WHEN k='booking' THEN 'provider_id' ELSE 'driver_id' END)::uuid THEN RETURN NEW; END IF;
 start_at:=(to_jsonb(NEW)->>'scheduled_for')::timestamptz; end_at:=(to_jsonb(NEW)->>'scheduled_until')::timestamptz;
 END IF;
 check_result:=public.dispatch_assignment_check(k,jid,aid,start_at,end_at);
 IF NOT coalesce((check_result->>'ok')::boolean,false) THEN RAISE EXCEPTION 'Scheduling conflict' USING DETAIL=check_result::text; END IF;
 RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.dispatch_control_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE k text; jid uuid; j jsonb; manual boolean; newj jsonb:=to_jsonb(NEW); oldj jsonb;
BEGIN
 IF TG_OP='UPDATE' THEN oldj:=to_jsonb(OLD); END IF;
 k:=CASE WHEN TG_TABLE_NAME IN ('bookings','job_offers') THEN 'booking' ELSE 'delivery' END;
 IF TG_TABLE_NAME IN ('job_offers','delivery_offers') THEN
  jid:=(newj->>CASE WHEN k='booking' THEN 'booking_id' ELSE 'delivery_id' END)::uuid;
  IF k='booking' THEN SELECT to_jsonb(b) INTO j FROM public.bookings b WHERE id=jid FOR UPDATE; ELSE SELECT to_jsonb(d) INTO j FROM public.deliveries d WHERE id=jid FOR UPDATE; END IF;
  IF newj->>'status'='offered' AND (TG_OP='INSERT' OR oldj->>'status' IS DISTINCT FROM newj->>'status') THEN
   SELECT manual_dispatch INTO manual FROM public.admin_job_controls WHERE kind=k AND job_id=jid;
   IF public.dispatch_job_blocked(k,jid) OR j->>'status' NOT IN ('pending','matching','offered') OR coalesce(j->>'provider_id',j->>'driver_id') IS NOT NULL OR (coalesce(manual,false) AND coalesce(current_setting('zwits.dispatch_control',true),'')<>'on') THEN RAISE EXCEPTION 'Dispatch is paused or already assigned'; END IF;
  END IF;
 ELSE
  jid:=NEW.id;
  IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('cancelled','disputed') AND public.dispatch_job_blocked(k,jid) AND coalesce(current_setting('zwits.dispatch_control',true),'')<>'on' THEN RAISE EXCEPTION 'Job is on hold or awaiting approval'; END IF;
 END IF;
 RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.dispatch_job_blocked(_kind text, _id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ SELECT EXISTS(SELECT 1 FROM public.admin_job_controls WHERE kind=_kind AND job_id=_id AND held) OR EXISTS(SELECT 1 FROM public.admin_job_changes WHERE kind=_kind AND job_id=_id AND status IN ('pending_customer','pending_assignee')) $function$;
CREATE OR REPLACE FUNCTION public.dispatch_job_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ BEGIN NEW.updated_at:=greatest(clock_timestamp(),OLD.updated_at+interval '1 microsecond');RETURN NEW;END $function$;
CREATE OR REPLACE FUNCTION public.dispatch_schedule_shape_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN IF NEW.scheduled_until IS NOT NULL AND (NEW.scheduled_for IS NULL OR NEW.scheduled_until<=NEW.scheduled_for) THEN RAISE EXCEPTION 'Commitment end must follow scheduled start'; END IF; RETURN NEW; END $function$;
CREATE OR REPLACE FUNCTION public.driver_profile_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 IF public.is_trusted_writer() THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
 NEW.verification_status:='unverified'; NEW.reviewed_at:=NULL; NEW.submitted_at:=NULL; NEW.verification_application_id:=NULL;
 NEW.deliveries_completed:=0; NEW.rating_avg:=0; NEW.ratings_count:=0;
 ELSE
 NEW.user_id:=OLD.user_id; NEW.verification_status:=OLD.verification_status; NEW.reviewed_at:=OLD.reviewed_at;
 NEW.submitted_at:=OLD.submitted_at; NEW.verification_application_id:=OLD.verification_application_id;
 NEW.deliveries_completed:=OLD.deliveries_completed; NEW.rating_avg:=OLD.rating_avg; NEW.ratings_count:=OLD.ratings_count;
 IF ROW(NEW.full_name,NEW.licence_url,NEW.id_document_url,NEW.vehicle_doc_url,NEW.insurance_provider,NEW.insurance_expiry) IS DISTINCT FROM ROW(OLD.full_name,OLD.licence_url,OLD.id_document_url,OLD.vehicle_doc_url,OLD.insurance_provider,OLD.insurance_expiry) THEN
 IF OLD.verification_status='pending' THEN RAISE EXCEPTION 'Application under review; wait for the admin decision before changing verification details'; END IF;
 IF OLD.verification_status='approved' THEN NEW.verification_status:='unverified'; NEW.verification_application_id:=NULL; END IF;
 END IF;
 END IF;
 IF NEW.verification_status<>'approved' THEN NEW.available:=false; END IF;
 RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.driver_vehicle_verification_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE owner_id uuid; p public.driver_profiles;
BEGIN
 owner_id:=CASE WHEN TG_OP='DELETE' THEN OLD.user_id ELSE NEW.user_id END;
 SELECT * INTO p FROM public.driver_profiles WHERE user_id=owner_id FOR UPDATE;
 IF p.verification_status='pending' THEN RAISE EXCEPTION 'Application under review; vehicles cannot change until the admin decision'; END IF;
 IF p.verification_status='approved' THEN
 PERFORM set_config('zwits.trusted','on',true);
 UPDATE public.driver_profiles SET verification_status='unverified',verification_application_id=NULL,available=false WHERE id=p.id;
 PERFORM set_config('zwits.trusted','off',true);
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.ensure_provider_approved_for_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.provider_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.providers
    WHERE id = NEW.provider_id AND verification_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Provider is not verified';
  END IF;
  RETURN NEW;
END;$function$;
CREATE OR REPLACE FUNCTION public.guard_provider_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END;$function$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;
CREATE OR REPLACE FUNCTION public.is_provider_available_at(_user_id uuid, _at timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT NOT EXISTS (
      SELECT 1 FROM public.provider_time_off t
      WHERE t.user_id = _user_id
        AND t.day = ((_at AT TIME ZONE 'Africa/Harare')::date)
    )
    AND (
      NOT EXISTS (SELECT 1 FROM public.provider_availability a WHERE a.user_id = _user_id)
      OR EXISTS (
        SELECT 1 FROM public.provider_availability a
        WHERE a.user_id = _user_id
          AND a.enabled
          AND a.weekday = EXTRACT(isodow FROM (_at AT TIME ZONE 'Africa/Harare'))::smallint
          AND ((_at AT TIME ZONE 'Africa/Harare')::time) >= a.start_time
          AND ((_at AT TIME ZONE 'Africa/Harare')::time) <= a.end_time
      )
    );
$function$;
CREATE OR REPLACE FUNCTION public.is_trusted_writer()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(auth.role(), '') IN ('service_role', 'supabase_admin')
      OR coalesce(current_setting('zwits.trusted', true), '') = 'on'
      OR public.has_role(auth.uid(), 'admin');
$function$;
CREATE OR REPLACE FUNCTION public.log_admin_action(_action text, _subject_type text, _subject_id uuid DEFAULT NULL::uuid, _metadata jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  INSERT INTO public.admin_audit_log (actor, action, subject_type, subject_id, metadata)
  VALUES (auth.uid(), _action, _subject_type, _subject_id, _metadata);
$function$;
CREATE OR REPLACE FUNCTION public.log_booking_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_status_history (booking_id, old_status, status, changed_by, metadata)
    VALUES (NEW.id, NULL, NEW.status::text, auth.uid(),
            jsonb_build_object('category', NEW.category, 'dispatch_state', NEW.dispatch_state));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.booking_status_history (booking_id, old_status, status, changed_by, metadata)
    VALUES (NEW.id, OLD.status::text, NEW.status::text, auth.uid(),
            jsonb_build_object('provider_id', NEW.provider_id, 'dispatch_state', NEW.dispatch_state));
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.log_delivery_event(_delivery_id uuid, _event text, _actor uuid DEFAULT NULL::uuid, _metadata jsonb DEFAULT NULL::jsonb, _dedupe_key text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  INSERT INTO public.delivery_events (delivery_id, event, actor, metadata, dedupe_key)
  VALUES (_delivery_id, _event, _actor, _metadata, _dedupe_key)
  ON CONFLICT (delivery_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
$function$;
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_title TEXT;
  v_body TEXT;
  v_kind TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.status
      WHEN 'accepted' THEN
        v_title := 'Booking accepted';
        v_body := 'A provider accepted your ' || NEW.category || ' booking.';
        v_kind := 'booking_accepted';
      WHEN 'travelling' THEN
        v_title := 'Provider on the way';
        v_body := 'Your ' || NEW.category || ' provider is travelling to you.';
        v_kind := 'booking_travelling';
      WHEN 'arrived' THEN
        v_title := 'Provider has arrived';
        v_body := 'Your ' || NEW.category || ' provider has arrived at the address.';
        v_kind := 'booking_arrived';
      WHEN 'in_progress' THEN
        v_title := 'Work started';
        v_body := 'Your ' || NEW.category || ' job is now in progress.';
        v_kind := 'booking_in_progress';
      WHEN 'completed' THEN
        v_title := 'Booking completed';
        v_body := 'Your ' || NEW.category || ' booking is complete.';
        v_kind := 'booking_completed';
      WHEN 'cancelled' THEN
        v_title := 'Booking cancelled';
        v_body := 'Your ' || NEW.category || ' booking was cancelled.';
        v_kind := 'booking_cancelled';
      ELSE
        RETURN NEW;
    END CASE;

    INSERT INTO public.notifications (user_id, title, body, link, kind)
    VALUES (NEW.customer_id, v_title, v_body, '/bookings/' || NEW.id, v_kind);
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.notify_provider_booking_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_provider_user UUID;
  v_title TEXT;
  v_body TEXT;
  v_kind TEXT;
BEGIN
  IF NEW.provider_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_provider_user FROM public.providers WHERE id = NEW.provider_id;
  IF v_provider_user IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_title := 'New booking request';
    v_body := 'You have a new ' || NEW.category || ' booking.';
    v_kind := 'provider_new_booking';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'cancelled' THEN
      v_title := 'Booking cancelled';
      v_body := 'A ' || NEW.category || ' booking was cancelled.';
      v_kind := 'provider_booking_cancelled';
    ELSIF NEW.status = 'completed' THEN
      v_title := 'Booking completed';
      v_body := 'A ' || NEW.category || ' booking was marked complete.';
      v_kind := 'provider_booking_completed';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, link, kind)
  VALUES (v_provider_user, v_title, v_body, '/bookings/' || NEW.id, v_kind);

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.post_wallet_transaction(_provider_user_id uuid, _type text, _amount numeric, _reference text, _booking_id uuid DEFAULT NULL::uuid, _delivery_id uuid DEFAULT NULL::uuid, _withdrawal_id uuid DEFAULT NULL::uuid, _note text DEFAULT NULL::text, _allow_negative boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
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
CREATE OR REPLACE FUNCTION public.provider_verification_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_trusted_writer() THEN
    -- Admin / trusted server workflow: keep the derived flags consistent.
    IF TG_OP = 'UPDATE' AND NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      NEW.reviewed_at := now();
      NEW.reviewed_by := COALESCE(auth.uid(), NEW.reviewed_by);
    END IF;
    IF NEW.verification_status = 'approved' THEN
      NEW.verified := true;
      NEW.revoke_reason := NULL;
    ELSIF NEW.verification_status = 'revoked' THEN
      NEW.verified := false;
      NEW.available := false;
    ELSE
      NEW.verified := false;
    END IF;
    RETURN NEW;
  END IF;

  -- Untrusted (the provider themselves): admin-controlled fields are immutable.
  IF TG_OP = 'INSERT' THEN
    NEW.verification_status := 'unverified';
    NEW.verified := false;
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
    NEW.revoke_reason := NULL;
    NEW.rating_avg := 0;
    NEW.ratings_count := 0;
    NEW.jobs_completed := 0;
  ELSE
    NEW.user_id := OLD.user_id;
    NEW.verification_status := OLD.verification_status;
    NEW.verified := OLD.verified;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.revoke_reason := OLD.revoke_reason;
    NEW.rating_avg := OLD.rating_avg;
    NEW.ratings_count := OLD.ratings_count;
    NEW.jobs_completed := OLD.jobs_completed;
  END IF;

  -- Complete document set submits for review — never auto-approves.
  IF NEW.id_document_url IS NOT NULL
     AND NEW.selfie_url IS NOT NULL
     AND NEW.business_doc_url IS NOT NULL
     AND NEW.verification_status = 'unverified' THEN
    NEW.verification_status := 'pending';
    NEW.submitted_at := COALESCE(NEW.submitted_at, now());
  END IF;

  IF NEW.verification_status <> 'approved' THEN
    NEW.verified := false;
  END IF;
  IF NEW.verification_status = 'revoked' THEN
    NEW.available := false;
  END IF;

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.settle_booking(_booking_id uuid)
 RETURNS TABLE(gross numeric, commission numeric, provider_earnings numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE b public.bookings; uid uuid; g numeric; c numeric; direct boolean;
BEGIN
 IF NOT public.is_trusted_writer() THEN RAISE EXCEPTION 'Settlement is performed by the platform only'; END IF;
 SELECT * INTO b FROM public.bookings WHERE id=_booking_id FOR UPDATE;
 IF NOT FOUND OR b.status<>'completed' OR b.provider_id IS NULL THEN RAISE EXCEPTION 'Completed assigned booking required'; END IF;
 IF EXISTS(SELECT 1 FROM public.wallet_transactions WHERE reference='booking:'||b.id||':commission') THEN
 RETURN QUERY SELECT coalesce(b.price,b.budget,0),-w.amount,coalesce(b.price,b.budget,0)+w.amount FROM public.wallet_transactions w WHERE w.reference='booking:'||b.id||':commission'; RETURN;
 END IF;
 SELECT p.payment_method IN ('cash','direct_ecocash','direct_bank') INTO direct FROM public.payments p WHERE p.booking_id=b.id AND p.status='paid';
 IF direct IS NULL THEN RAISE EXCEPTION 'Payment is not confirmed'; END IF;
 SELECT user_id INTO uid FROM public.providers WHERE id=b.provider_id;
 g:=coalesce(b.price,b.budget,0); c:=public.calc_commission(b.category,g);
 PERFORM public.post_wallet_transaction(uid,'job_earning',g,'booking:'||b.id||':earning',b.id,NULL,NULL,'Job value for '||b.category);
 IF direct THEN PERFORM public.post_wallet_transaction(uid,'adjustment',-g,'booking:'||b.id||':cash_held',b.id,NULL,NULL,'Payment held directly by provider',true); END IF;
 PERFORM public.post_wallet_transaction(uid,'commission',-c,'booking:'||b.id||':commission',b.id,NULL,NULL,'Zwits commission on '||b.category,direct);
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(uid,CASE WHEN direct THEN 'Direct payment recorded' ELSE 'Earnings credited' END,CASE WHEN direct THEN 'You hold the customer payment. Commission is recorded as owed; no payout was credited.' ELSE 'Your wallet was credited for a completed job.' END,'/provider/dashboard','earnings_credited');
 RETURN QUERY SELECT g,c,g-c;
END $function$;
CREATE OR REPLACE FUNCTION public.settle_delivery(_delivery_id uuid)
 RETURNS TABLE(gross numeric, commission numeric, provider_earnings numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE d public.deliveries; p public.payments; g numeric; c numeric; held boolean; e public.wallet_transactions; w public.wallet_transactions; h public.wallet_transactions;
BEGIN
 IF NOT coalesce(public.is_trusted_writer(),false) THEN RAISE EXCEPTION 'Settlement is performed by the platform only'; END IF;
 SELECT * INTO d FROM public.deliveries WHERE id=_delivery_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
 IF d.status IS DISTINCT FROM 'delivered' OR d.driver_id IS NULL THEN RAISE EXCEPTION 'Completed assigned delivery required'; END IF;
 SELECT * INTO p FROM public.payments WHERE delivery_id=d.id FOR UPDATE;
 IF NOT FOUND OR p.status IS DISTINCT FROM 'paid' OR d.payment_status IS DISTINCT FROM 'paid' OR p.customer_id IS DISTINCT FROM d.customer_id OR p.amount IS DISTINCT FROM d.price OR p.currency IS DISTINCT FROM 'USD' OR p.payment_method IS DISTINCT FROM d.payment_method THEN RAISE EXCEPTION 'Confirmed matching payment required'; END IF;
 held:=p.payment_method IN ('cash','direct_ecocash','direct_bank');
 SELECT * INTO e FROM public.wallet_transactions WHERE reference='delivery:'||d.id||':earning';
 SELECT * INTO w FROM public.wallet_transactions WHERE reference='delivery:'||d.id||':commission';
 SELECT * INTO h FROM public.wallet_transactions WHERE reference='delivery:'||d.id||':cash_held';
 IF e.id IS NOT NULL OR w.id IS NOT NULL OR h.id IS NOT NULL THEN
  IF e.id IS NULL OR w.id IS NULL OR (held AND h.id IS NULL) OR (NOT held AND h.id IS NOT NULL) OR e.provider_user_id IS DISTINCT FROM d.driver_id OR w.provider_user_id IS DISTINCT FROM d.driver_id OR e.delivery_id IS DISTINCT FROM d.id OR w.delivery_id IS DISTINCT FROM d.id OR e.type<>'job_earning' OR w.type<>'commission' OR e.amount IS DISTINCT FROM p.amount OR w.amount>0 OR (held AND (h.amount IS DISTINCT FROM -e.amount OR h.provider_user_id IS DISTINCT FROM d.driver_id OR h.delivery_id IS DISTINCT FROM d.id OR h.type<>'adjustment')) THEN RAISE EXCEPTION 'Existing settlement requires investigation; ledger preserved'; END IF;
  RETURN QUERY SELECT e.amount,-w.amount,e.amount+w.amount; RETURN;
 END IF;
 g:=d.price;
 IF g IS NULL OR g<=0 THEN RAISE EXCEPTION 'Positive agreed delivery price required'; END IF;
 c:=public.calc_commission('delivery',g);
 PERFORM public.post_wallet_transaction(d.driver_id,'job_earning',g,'delivery:'||d.id||':earning',NULL,d.id,NULL,'Delivery gross earnings');
 IF held THEN PERFORM public.post_wallet_transaction(d.driver_id,'adjustment',-g,'delivery:'||d.id||':cash_held',NULL,d.id,NULL,'Customer payment already held by driver; not platform funds',true); END IF;
 PERFORM public.post_wallet_transaction(d.driver_id,'commission',-c,'delivery:'||d.id||':commission',NULL,d.id,NULL,'Zwits commission on delivery',held);
 PERFORM public.log_delivery_event(d.id,'delivery_settled',auth.uid(),jsonb_build_object('gross',g,'commission',c,'driver_earnings',g-c,'driver_held',held,'reason','Completed delivery with matching confirmed payment'),'delivery_settled');
 INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(d.driver_id,CASE WHEN held THEN 'Direct payment recorded' ELSE 'Earnings credited' END,CASE WHEN held THEN 'You hold the customer payment. Commission is recorded as owed; no payout was credited.' ELSE 'Your wallet was credited for a completed delivery.' END,'/driver','earnings_credited');
 RETURN QUERY SELECT g,c,g-c;
END $function$;
CREATE OR REPLACE FUNCTION public.update_delivery_progress_atomic(_id uuid, _status text, _proof text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE d public.deliveries; actor uuid:=auth.uid(); allowed boolean; prior_trust text:=coalesce(current_setting('zwits.trusted',true),''); proof_path text; recipient uuid;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO d FROM public.deliveries WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
 allowed:=coalesce(d.driver_id=actor,false) OR (coalesce(d.customer_id=actor,false) AND coalesce(_status='cancelled',false));
 IF allowed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Not allowed'; END IF;
 IF _status IS NULL OR _status NOT IN ('picked_up','delivered','cancelled') OR NOT coalesce(public.delivery_transition_allowed(d.status,_status),false) THEN RAISE EXCEPTION 'Invalid delivery transition'; END IF;
 IF _status<>'cancelled' AND public.dispatch_job_blocked('delivery',_id) THEN RAISE EXCEPTION 'Job is on hold or awaiting approval'; END IF;
 IF _status='delivered' THEN
  proof_path:=CASE WHEN d.status='delivered' THEN d.proof_photo_url ELSE _proof END;
  IF proof_path IS NULL OR proof_path !~ ('^'||actor::text||'/'||d.id::text||'/delivery-proof-[0-9a-f-]+\.(jpg|png|webp)$') OR d.picked_up_at IS NULL OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='job-photos' AND o.name=proof_path AND (o.owner_id=actor::text OR o.owner=actor) AND o.created_at>=d.picked_up_at AND o.metadata->>'mimetype' IN ('image/jpeg','image/png','image/webp')) THEN RAISE EXCEPTION 'Upload authorised delivery-specific evidence after pickup before completing'; END IF;
 END IF;
 IF d.status=_status THEN RETURN jsonb_build_object('ok',true,'unchanged',true); END IF;
 PERFORM set_config('zwits.trusted','on',true);
 UPDATE public.deliveries SET status=_status,picked_up_at=CASE WHEN _status='picked_up' THEN now() ELSE picked_up_at END,delivered_at=CASE WHEN _status='delivered' THEN now() ELSE delivered_at END,proof_photo_url=CASE WHEN _status='delivered' THEN proof_path ELSE proof_photo_url END WHERE id=_id;
 IF _status='delivered' THEN UPDATE public.driver_profiles SET deliveries_completed=deliveries_completed+1 WHERE user_id=d.driver_id; END IF;
 PERFORM public.log_delivery_event(_id,'delivery_'||_status,actor,jsonb_build_object('proof',proof_path,'old_status',d.status,'reason','Participant confirmed delivery progress'),NULL);
 recipient:=CASE WHEN actor=d.driver_id THEN d.customer_id ELSE d.driver_id END;
 IF recipient IS NOT NULL THEN INSERT INTO public.notifications(user_id,title,body,link,kind) VALUES(recipient,'Delivery progress updated',replace(_status,'_',' '),'/deliveries/'||_id,'delivery_'||_status); END IF;
 IF _status='delivered' AND d.payment_status='paid' THEN PERFORM public.settle_delivery(_id); END IF;
 PERFORM set_config('zwits.trusted',prior_trust,true);
 RETURN jsonb_build_object('ok',true);
END $function$;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.validate_admin_change_record()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE j jsonb; f text; v jsonb; distance numeric; base numeric; perkm numeric; multiplier numeric; a numeric; b numeric; c numeric; d numeric; s numeric; current_assignee uuid;
BEGIN
 IF NEW.kind='booking' THEN SELECT to_jsonb(t) INTO j FROM public.bookings t WHERE id=NEW.job_id FOR UPDATE; SELECT user_id INTO current_assignee FROM public.providers WHERE id=(j->>'provider_id')::uuid;
 ELSE SELECT to_jsonb(t) INTO j FROM public.deliveries t WHERE id=NEW.job_id FOR UPDATE; current_assignee:=(j->>'driver_id')::uuid; END IF;
 IF j IS NULL OR NEW.customer_id IS DISTINCT FROM (j->>'customer_id')::uuid OR NEW.assignee_user_id IS DISTINCT FROM current_assignee THEN RAISE EXCEPTION 'Job participants changed'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.kind IS DISTINCT FROM OLD.kind OR NEW.job_id IS DISTINCT FROM OLD.job_id OR NEW.proposed_values IS DISTINCT FROM OLD.proposed_values OR NEW.before_values IS DISTINCT FROM OLD.before_values THEN RAISE EXCEPTION 'Proposals are immutable'; END IF;
  RETURN NEW;
 END IF;
 FOR f IN SELECT jsonb_object_keys(NEW.proposed_values) LOOP
  IF NOT f=ANY(CASE WHEN NEW.kind='booking' THEN ARRAY['address','description','scheduled_for','scheduled_until','price','contact_phone','location_notes','lat','lng'] ELSE ARRAY['pickup_address','dropoff_address','pickup_lat','pickup_lng','dropoff_lat','dropoff_lng','recipient_name','recipient_phone','notes','scheduled_for','scheduled_until','parcel_size','price','distance_km','location_notes'] END) THEN RAISE EXCEPTION 'Field is not editable'; END IF;
  IF length(coalesce(NEW.proposed_values->>f,''))>2000 THEN RAISE EXCEPTION 'Field too long'; END IF;
  IF f IN ('lat','pickup_lat','dropoff_lat') AND abs((NEW.proposed_values->>f)::numeric)>90 THEN RAISE EXCEPTION 'Invalid latitude'; END IF;
  IF f IN ('lng','pickup_lng','dropoff_lng') AND abs((NEW.proposed_values->>f)::numeric)>180 THEN RAISE EXCEPTION 'Invalid longitude'; END IF;
 END LOOP;
 v:=j||NEW.proposed_values; IF v->>'scheduled_until' IS NOT NULL AND (v->>'scheduled_for' IS NULL OR (v->>'scheduled_until')::timestamptz <= (v->>'scheduled_for')::timestamptz) THEN RAISE EXCEPTION 'Commitment end must follow start'; END IF; IF current_assignee IS NOT NULL AND NEW.proposed_values ?| ARRAY['scheduled_for','scheduled_until'] THEN IF NOT (public.dispatch_assignment_check(NEW.kind,NEW.job_id,CASE WHEN NEW.kind='booking' THEN (j->>'provider_id')::uuid ELSE current_assignee END,(v->>'scheduled_for')::timestamptz,(v->>'scheduled_until')::timestamptz)->>'ok')::boolean THEN RAISE EXCEPTION 'Scheduling conflict: inspect assignee commitments before proposing'; END IF; END IF;
 IF NEW.kind='delivery' AND NEW.proposed_values ?| ARRAY['pickup_address','dropoff_address','pickup_lat','pickup_lng','dropoff_lat','dropoff_lng','parcel_size','price','distance_km'] THEN
  a:=(v->>'pickup_lat')::numeric; b:=(v->>'pickup_lng')::numeric;c:=(v->>'dropoff_lat')::numeric;d:=(v->>'dropoff_lng')::numeric;
  IF a IS NULL OR b IS NULL OR c IS NULL OR d IS NULL OR abs(a)>90 OR abs(c)>90 OR abs(b)>180 OR abs(d)>180 THEN RAISE EXCEPTION 'Complete valid route coordinates required for price changes'; END IF;
  IF NEW.proposed_values ? 'pickup_address' AND NEW.proposed_values->>'pickup_address' IS DISTINCT FROM j->>'pickup_address' AND NOT (NEW.proposed_values ? 'pickup_lat' AND NEW.proposed_values ? 'pickup_lng') THEN RAISE EXCEPTION 'Corrected pickup coordinates required'; END IF;
  IF NEW.proposed_values ? 'dropoff_address' AND NEW.proposed_values->>'dropoff_address' IS DISTINCT FROM j->>'dropoff_address' AND NOT (NEW.proposed_values ? 'dropoff_lat' AND NEW.proposed_values ? 'dropoff_lng') THEN RAISE EXCEPTION 'Corrected destination coordinates required'; END IF;
  s:=power(sin(radians((c-a)::double precision)/2),2)+cos(radians(a::double precision))*cos(radians(c::double precision))*power(sin(radians((d-b)::double precision)/2),2);
  distance:=round((12742*asin(sqrt(least(1,s))) )::numeric,1);
  base:=CASE v->>'service_tier' WHEN 'express_bike' THEN 3 WHEN 'standard_van' THEN 12 WHEN 'business_courier' THEN 20 ELSE NULL END;
  perkm:=CASE v->>'service_tier' WHEN 'express_bike' THEN 0.55 WHEN 'standard_van' THEN 0.9 WHEN 'business_courier' THEN 0.8 ELSE NULL END;
  multiplier:=CASE v->>'parcel_size' WHEN 'small' THEN 1 WHEN 'medium' THEN 1.15 WHEN 'large' THEN 1.4 ELSE NULL END;
  IF base IS NULL OR multiplier IS NULL THEN RAISE EXCEPTION 'Invalid delivery tier or parcel size'; END IF;
  NEW.proposed_values:=NEW.proposed_values||jsonb_build_object('distance_km',distance,'price',round((base+perkm*greatest(1,distance))*multiplier,2));
 END IF;
 RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.wallet_transactions_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'wallet_transactions is an immutable ledger; post a reversing entry instead';
END;
$function$;
CREATE TRIGGER aa_delivery_duration BEFORE INSERT OR UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION delivery_duration_guard();
CREATE TRIGGER aa_dispatch_delivery_guard BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION dispatch_control_guard();
CREATE TRIGGER ab_delivery_commitment BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION dispatch_commitment_guard();
CREATE TRIGGER ab_delivery_custody BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION delivery_custody_guard();
CREATE TRIGGER ac_delivery_schedule_shape BEFORE INSERT OR UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION dispatch_schedule_shape_guard();
CREATE TRIGGER trg_delivery_mutation_guard BEFORE INSERT OR UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION delivery_mutation_guard();
CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER zz_dispatch_delivery_version BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION dispatch_job_version();
CREATE TRIGGER trg_driver_profile_guard BEFORE INSERT OR UPDATE ON public.driver_profiles FOR EACH ROW EXECUTE FUNCTION driver_profile_guard();
CREATE TRIGGER update_driver_profiles_updated_at BEFORE UPDATE ON public.driver_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER provider_wallets_updated_at BEFORE UPDATE ON public.provider_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER wallet_transactions_no_mutate BEFORE DELETE OR UPDATE ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION wallet_transactions_immutable();
GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role; GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
CREATE POLICY test_delivery_read ON deliveries FOR SELECT TO authenticated USING(customer_id=auth.uid() OR driver_id=auth.uid());
CREATE POLICY test_wallet_read ON provider_wallets FOR SELECT TO authenticated USING(provider_user_id=auth.uid());
CREATE POLICY test_ledger_read ON wallet_transactions FOR SELECT TO authenticated USING(provider_user_id=auth.uid());
