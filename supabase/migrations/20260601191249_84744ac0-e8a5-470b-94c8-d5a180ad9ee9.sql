CREATE TABLE public.commission_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL UNIQUE,
  percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (percent >= 0 AND percent <= 100),
  min_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (min_fee >= 0),
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.commission_rates TO authenticated;
GRANT ALL ON public.commission_rates TO service_role;

ALTER TABLE public.commission_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Commission rates viewable by authenticated"
ON public.commission_rates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins insert commission rates"
ON public.commission_rates FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update commission rates"
ON public.commission_rates FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete commission rates"
ON public.commission_rates FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_commission_rates_updated_at
BEFORE UPDATE ON public.commission_rates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.commission_rate_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  percent NUMERIC(5,2) NOT NULL,
  min_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  changed_by UUID,
  change_kind TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.commission_rate_history TO authenticated;
GRANT ALL ON public.commission_rate_history TO service_role;

ALTER TABLE public.commission_rate_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view commission rate history"
ON public.commission_rate_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_commission_rate_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.commission_rate_history (category, percent, min_fee, notes, active, changed_by, change_kind)
    VALUES (OLD.category, OLD.percent, OLD.min_fee, OLD.notes, OLD.active, auth.uid(), 'delete');
    RETURN OLD;
  ELSE
    INSERT INTO public.commission_rate_history (category, percent, min_fee, notes, active, changed_by, change_kind)
    VALUES (NEW.category, NEW.percent, NEW.min_fee, NEW.notes, NEW.active, auth.uid(), TG_OP);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_commission_rates_history
AFTER INSERT OR UPDATE OR DELETE ON public.commission_rates
FOR EACH ROW EXECUTE FUNCTION public.log_commission_rate_change();