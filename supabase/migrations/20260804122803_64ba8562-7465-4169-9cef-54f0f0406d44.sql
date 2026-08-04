-- Column-level REVOKE is a no-op while a table-wide SELECT grant exists, so
-- drop the table-wide grant and re-grant SELECT column by column, omitting the
-- three verification-document path columns.
REVOKE SELECT ON public.providers FROM authenticated;
REVOKE SELECT ON public.providers FROM anon;

GRANT SELECT (
  id, user_id, business_name, category, bio, city, hourly_rate, verified, available,
  rating_avg, ratings_count, jobs_completed, verification_status, submitted_at,
  reviewed_at, reviewed_by, revoke_reason, onboarding_completed_at, created_at, updated_at
) ON public.providers TO authenticated;

GRANT SELECT (
  id, user_id, business_name, category, bio, city, hourly_rate, verified, available,
  rating_avg, ratings_count, jobs_completed, verification_status, submitted_at,
  reviewed_at, reviewed_by, revoke_reason, onboarding_completed_at, created_at, updated_at
) ON public.providers TO anon;