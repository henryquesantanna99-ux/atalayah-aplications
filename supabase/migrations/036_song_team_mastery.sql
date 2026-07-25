-- Team readiness belongs to the canonical song, rather than to one of its
-- arrangements.  Keep the accepted labels in one database constraint so API
-- clients cannot introduce values the readiness calculation does not know.
alter table public.songs
  add column team_mastery text not null default 'Só algumas pessoas'
  constraint songs_team_mastery_check check (
    team_mastery in (
      '100% da equipe',
      'Apenas a banda',
      'Apenas os vocais',
      'Só algumas pessoas'
    )
  );

-- Persisted repertoire analysis.  `stage_manually_adjusted` is deliberately
-- separate from the suggestion: recalculation may refresh the suggestion but
-- must never move a card which a leader has already moved.
create table if not exists public.repertoire_analyses (
  id uuid primary key default extensions.uuid_generate_v4(),
  song_id uuid not null unique references public.songs(id) on delete cascade,
  readiness_index integer not null default 25 check (readiness_index between 0 and 100),
  readiness_level text not null default 'Baixo' check (readiness_level in ('Baixo', 'Médio', 'Alto', 'Completo')),
  suggested_stage text not null default 'Aprendizado',
  stage text not null default 'Aprendizado',
  stage_manually_adjusted boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.repertoire_analyses (song_id, readiness_index, readiness_level, suggested_stage, stage)
select id, 25, 'Baixo', 'Aprendizado', 'Aprendizado'
from public.songs
on conflict (song_id) do nothing;

alter table public.repertoire_analyses enable row level security;

create policy "active members read repertoire analyses" on public.repertoire_analyses
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
  );

create policy "admins manage repertoire analyses" on public.repertoire_analyses
  for all using (public.is_admin()) with check (public.is_admin());
