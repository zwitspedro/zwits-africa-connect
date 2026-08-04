CREATE TABLE IF NOT EXISTS public.provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  enabled boolean NOT NULL DEFAULT true,
  start_time time NOT NULL DEFAULT '08:00',
  end_time time NOT NULL DEFAULT '17:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, weekday)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_availability TO authenticated;
GRANT ALL ON public.provider_availability TO service_role;
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers manage own availability"
  ON public.provider_availability FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_provider_availability_updated_at
  BEFORE UPDATE ON public.provider_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.provider_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_time_off TO authenticated;
GRANT ALL ON public.provider_time_off TO service_role;
ALTER TABLE public.provider_time_off ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers manage own time off"
  ON public.provider_time_off FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_provider_time_off_updated_at
  BEFORE UPDATE ON public.provider_time_off
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_provider_available_at(_user_id uuid, _at timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.is_provider_available_at(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_provider_available_at(uuid, timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.log_marketplace_event(
  _booking_id uuid,
  _event text,
  _actor uuid DEFAULT NULL,
  _metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.booking_status_history (booking_id, status, changed_by, note)
  VALUES (_booking_id, _event, _actor, CASE WHEN _metadata IS NULL THEN NULL ELSE _metadata::text END);
$$;

REVOKE ALL ON FUNCTION public.log_marketplace_event(uuid, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_marketplace_event(uuid, text, uuid, jsonb) TO service_role;