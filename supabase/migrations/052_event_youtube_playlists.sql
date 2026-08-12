-- Keep YouTube playlist delivery state on the event so retries are observable.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS youtube_playlist_id text,
  ADD COLUMN IF NOT EXISTS youtube_playlist_url text,
  ADD COLUMN IF NOT EXISTS youtube_playlist_sync_status text NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS youtube_playlist_last_error text,
  ADD COLUMN IF NOT EXISTS youtube_playlist_synced_at timestamptz;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_youtube_playlist_sync_status_check;
ALTER TABLE events ADD CONSTRAINT events_youtube_playlist_sync_status_check
  CHECK (youtube_playlist_sync_status IN ('not_requested', 'pending', 'syncing', 'synced', 'failed'));

-- Any change to the playlist inputs schedules reconciliation. Existing playlist
-- identifiers deliberately remain in place, preventing edits from creating a new one.
CREATE OR REPLACE FUNCTION public.mark_event_youtube_playlist_pending()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE events
  SET youtube_playlist_sync_status = 'pending', youtube_playlist_last_error = NULL
  WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.event_id ELSE NEW.event_id END AND type = 'culto';
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_event_title_youtube_playlist_pending()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.type = 'culto' AND (OLD.title IS DISTINCT FROM NEW.title OR OLD.type IS DISTINCT FROM NEW.type) THEN
    NEW.youtube_playlist_sync_status := 'pending';
    NEW.youtube_playlist_last_error := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_mark_youtube_playlist_pending ON events;
CREATE TRIGGER events_mark_youtube_playlist_pending
BEFORE UPDATE OF title, type ON events FOR EACH ROW
EXECUTE FUNCTION public.mark_event_title_youtube_playlist_pending();

DROP TRIGGER IF EXISTS setlist_mark_youtube_playlist_pending ON setlist_songs;
CREATE TRIGGER setlist_mark_youtube_playlist_pending
AFTER INSERT OR UPDATE OR DELETE ON setlist_songs FOR EACH ROW
EXECUTE FUNCTION public.mark_event_youtube_playlist_pending();
