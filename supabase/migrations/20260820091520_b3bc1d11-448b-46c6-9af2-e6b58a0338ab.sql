ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'matching';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'offered';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'provider_arriving';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'disputed';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'refunded';