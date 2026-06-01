
-- Add attachment columns
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ALTER COLUMN content DROP NOT NULL;

-- Allow empty content when an attachment is present
ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_or_attachment_chk
  CHECK (
    (content IS NOT NULL AND length(btrim(content)) > 0)
    OR attachment_url IS NOT NULL
  );

-- Storage bucket for chat attachments (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Users can upload into their own folder: {auth.uid}/...
CREATE POLICY "Users upload own chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view attachments tied to messages they sent or received
CREATE POLICY "Users view chat attachments for their messages"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.attachment_url LIKE '%' || name
      AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
  )
);

-- Users can delete their own attachments
CREATE POLICY "Users delete own chat attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
