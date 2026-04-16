-- Allow external events in the ministry agenda.
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_type_check;

ALTER TABLE events
  ADD CONSTRAINT events_type_check
  CHECK (type IN ('culto', 'ensaio', 'comunhao', 'evento_externo'));
