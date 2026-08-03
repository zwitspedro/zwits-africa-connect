-- Internal guards/triggers must not be callable through the API.
REVOKE ALL ON FUNCTION public.provider_verification_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.driver_profile_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_mutation_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delivery_mutation_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_trusted_writer() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_provider_rating() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_jobs_completed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_provider_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_booking_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_booking_participant(uuid, uuid) TO authenticated;

-- Chat attachments: participation in the booking is required, not just being
-- named on the message row.
DROP POLICY IF EXISTS "Users view chat attachments for their messages" ON storage.objects;
CREATE POLICY "Participants view chat attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.attachment_url = objects.name
        AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
        AND public.is_booking_participant(m.booking_id, auth.uid())
    )
  );