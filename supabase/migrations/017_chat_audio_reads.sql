-- Delivery/read receipts for group chat messages.
CREATE TABLE chat_message_reads (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  UNIQUE(message_id, profile_id)
);

ALTER TABLE chat_message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_reads_read_active" ON chat_message_reads
  FOR SELECT USING (public.current_user_is_active());

CREATE POLICY "chat_reads_upsert_own" ON chat_message_reads
  FOR INSERT WITH CHECK (
    profile_id = auth.uid()
    AND public.current_user_is_active()
  );

CREATE POLICY "chat_reads_update_own" ON chat_message_reads
  FOR UPDATE USING (
    profile_id = auth.uid()
    AND public.current_user_is_active()
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND public.current_user_is_active()
  );

ALTER PUBLICATION supabase_realtime ADD TABLE chat_message_reads;

-- Public bucket for short chat audio clips.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-audio',
  'chat-audio',
  true,
  10485760,
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "chat_audio_read_active" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-audio'
    AND public.current_user_is_active()
  );

CREATE POLICY "chat_audio_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-audio'
    AND owner = auth.uid()
    AND public.current_user_is_active()
  );
