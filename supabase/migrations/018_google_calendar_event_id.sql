-- Stores the Google Calendar event id when a Meet link is generated.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;
