create table if not exists spiritual_intelligence_runs (
  id uuid primary key default gen_random_uuid(),
  analysis_date date not null,
  status text not null default 'completed',
  suggestions_count integer not null default 0,
  ministry_profile_id uuid references ministry_profiles(id) on delete set null,
  model_used text,
  created_by uuid references auth.users(id) on delete set null,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists spiritual_intelligence_classifications (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references spiritual_intelligence_runs(id) on delete cascade,
  suggestion_id uuid not null references worship_song_suggestions(id) on delete cascade,
  classification jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  model_used text,
  created_at timestamptz not null default now(),
  unique(run_id, suggestion_id)
);

create table if not exists spiritual_intelligence_daily_summaries (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references spiritual_intelligence_runs(id) on delete cascade,
  analysis_date date not null,
  quantification jsonb not null default '{}'::jsonb,
  segmentation jsonb not null default '[]'::jsonb,
  associations jsonb not null default '[]'::jsonb,
  evolution jsonb not null default '{}'::jsonb,
  discernment jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  charts_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table spiritual_intelligence_runs enable row level security;
alter table spiritual_intelligence_classifications enable row level security;
alter table spiritual_intelligence_daily_summaries enable row level security;

drop policy if exists "Admins manage spiritual intelligence runs" on spiritual_intelligence_runs;
create policy "Admins manage spiritual intelligence runs" on spiritual_intelligence_runs for all using (auth.uid() is not null) with check (auth.uid() is not null);
drop policy if exists "Admins manage spiritual intelligence classifications" on spiritual_intelligence_classifications;
create policy "Admins manage spiritual intelligence classifications" on spiritual_intelligence_classifications for all using (auth.uid() is not null) with check (auth.uid() is not null);
drop policy if exists "Admins manage spiritual intelligence summaries" on spiritual_intelligence_daily_summaries;
create policy "Admins manage spiritual intelligence summaries" on spiritual_intelligence_daily_summaries for all using (auth.uid() is not null) with check (auth.uid() is not null);

create index if not exists spiritual_intelligence_runs_analysis_date_idx on spiritual_intelligence_runs(analysis_date desc);
create index if not exists spiritual_intelligence_daily_summaries_analysis_date_idx on spiritual_intelligence_daily_summaries(analysis_date desc);
