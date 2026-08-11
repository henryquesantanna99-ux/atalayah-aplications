-- Normalize the alternate rehearsal contract introduced by the former
-- 042_sentinela_season_authorization migration without rewriting its history.
do $$
begin
  if to_regclass('public.sentinela_rehearsals') is null then
    raise exception 'public.sentinela_rehearsals must exist before it can be normalized';
  end if;

  -- Rename first so existing data and indexes follow the canonical columns.
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sentinela_rehearsals' and column_name = 'scheduled_at')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sentinela_rehearsals' and column_name = 'starts_at') then
    alter table public.sentinela_rehearsals rename column scheduled_at to starts_at;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sentinela_rehearsals' and column_name = 'private_notes')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sentinela_rehearsals' and column_name = 'notes') then
    alter table public.sentinela_rehearsals rename column private_notes to notes;
  end if;
end $$;

alter table public.sentinela_rehearsals
  add column if not exists phase_id uuid,
  add column if not exists ends_at timestamptz,
  add column if not exists location text,
  add column if not exists notes text,
  add column if not exists status text not null default 'scheduled';

-- A database that briefly had both contracts keeps the canonical values and
-- then removes every alternate-only column and dependency.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sentinela_rehearsals' and column_name = 'scheduled_at') then
    execute 'update public.sentinela_rehearsals set starts_at = coalesce(starts_at, scheduled_at)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sentinela_rehearsals' and column_name = 'private_notes') then
    execute 'update public.sentinela_rehearsals set notes = coalesce(notes, private_notes)';
  end if;
end $$;

drop policy if exists sentinela_rehearsals_manager_insert on public.sentinela_rehearsals;
drop index if exists public.sentinela_rehearsals_season;
alter table public.sentinela_rehearsals
  drop column if exists scheduled_at,
  drop column if exists private_notes,
  drop column if exists created_by;

alter table public.sentinela_rehearsals alter column starts_at set not null;

-- Constraints are added idempotently because installations may already have
-- received the complete practice schema.
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.sentinela_rehearsals'::regclass and conname = 'sentinela_rehearsals_status_check') then
    alter table public.sentinela_rehearsals add constraint sentinela_rehearsals_status_check check (status in ('scheduled', 'completed', 'cancelled'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.sentinela_rehearsals'::regclass and conname = 'sentinela_rehearsals_ends_after_start_check') then
    alter table public.sentinela_rehearsals add constraint sentinela_rehearsals_ends_after_start_check check (ends_at is null or ends_at >= starts_at);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.sentinela_rehearsals'::regclass and conname = 'sentinela_rehearsals_season_id_id_key') then
    alter table public.sentinela_rehearsals add constraint sentinela_rehearsals_season_id_id_key unique (season_id, id);
  end if;
  if to_regclass('public.sentinela_phases') is not null
     and not exists (select 1 from pg_constraint where conrelid = 'public.sentinela_rehearsals'::regclass and conname = 'sentinela_rehearsals_season_id_phase_id_fkey') then
    alter table public.sentinela_rehearsals add constraint sentinela_rehearsals_season_id_phase_id_fkey
      foreign key (season_id, phase_id) references public.sentinela_phases (season_id, id);
  end if;
end $$;

create index if not exists sentinela_rehearsals_season_starts_at_idx
  on public.sentinela_rehearsals (season_id, starts_at);

-- Restore the alternate installation's insert authorization without retaining
-- its created_by requirement. Complete-schema installations use their existing
-- staff policy instead.
do $$
begin
  if to_regprocedure('public.can_manage_sentinela_rehearsals(uuid)') is not null
     and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sentinela_rehearsals' and policyname = 'sentinela_rehearsals_manager_insert') then
    create policy sentinela_rehearsals_manager_insert on public.sentinela_rehearsals for insert
      with check (public.can_manage_sentinela_rehearsals(season_id));
  end if;
end $$;
