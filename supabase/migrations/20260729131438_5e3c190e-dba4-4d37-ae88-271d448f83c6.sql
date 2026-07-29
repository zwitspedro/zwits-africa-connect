INSERT INTO public.providers (user_id, business_name, category, bio, city, hourly_rate, verified, available, verification_status, submitted_at, reviewed_at)
VALUES ('b5fe6a6e-b70b-4abd-9407-b3606198d13c', 'Sunrise Home Cleaning', 'cleaning', 'Test provider seeded for booking-flow verification.', 'Harare', 25, true, true, 'approved', now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES ('b5fe6a6e-b70b-4abd-9407-b3606198d13c', 'provider')
ON CONFLICT (user_id, role) DO NOTHING;