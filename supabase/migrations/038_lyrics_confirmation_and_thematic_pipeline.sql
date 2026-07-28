-- Auditable lyric confirmation checkpoint and the v2 thematic report payload.
alter table worship_song_suggestions
  add column if not exists letra_texto text,
  add column if not exists letra_status text not null default 'pendente'
    check (letra_status in ('pendente', 'confirmada', 'nao_confirmada')),
  add column if not exists letra_fonte_id text,
  add column if not exists letra_tentativas jsonb not null default '[]'::jsonb,
  add column if not exists gender text,
  add column if not exists state text,
  add column if not exists country text;

create table if not exists lyrics_confirmation_sessions (
  id uuid primary key default gen_random_uuid(),
  track_name text not null,
  artist_name text,
  attempt integer not null default 0 check (attempt between 0 and 3),
  rejected_results jsonb not null default '[]'::jsonb,
  candidate_id text,
  candidate_track text,
  candidate_artist text,
  candidate_lyrics text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'not_confirmed')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table lyrics_confirmation_sessions enable row level security;
-- This table is deliberately service-role-only: full lyrics never pass through a public policy.

alter table spiritual_intelligence_daily_summaries
  add column if not exists pipeline_version integer not null default 2,
  add column if not exists correlations jsonb not null default '[]'::jsonb,
  add column if not exists interpretation jsonb not null default '[]'::jsonb,
  add column if not exists actions jsonb not null default '[]'::jsonb,
  add column if not exists ministry_context jsonb not null default '{}'::jsonb;
