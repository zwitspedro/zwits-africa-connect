CREATE POLICY "Customers upload own job photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'job-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Customers view own job photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'job-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Customers delete own job photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'job-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Assigned providers and admins view job photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'job-photos' AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.providers p ON p.id = b.provider_id
      WHERE p.user_id = auth.uid()
        AND b.customer_id::text = (storage.foldername(storage.objects.name))[1]
    )
  )
);