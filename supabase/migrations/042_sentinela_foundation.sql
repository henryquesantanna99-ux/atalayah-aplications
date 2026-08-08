-- Sentinela is a bounded account scope. All domain rows carry a season_id and
-- authorization comes from season_memberships, never from e-mail metadata.
create type public.sentinela_role as enum ('participant', 'mentor', 'coordinator', 'admin');

create table public.sentinela_seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check (ends_at >= starts_at)
);

create table public.sentinela_memberships (
  season_id uuid not null references public.sentinela_seasons(id) on delete cascade,
  profile_id uuid not null references auth.users(id) on delete cascade,
  role public.sentinela_role not null default 'participant',
  primary key (season_id, profile_id)
);

create or replace function public.is_sentinela_member(requested_season uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.sentinela_memberships m where m.season_id = requested_season and m.profile_id = auth.uid()) $$;

create or replace function public.has_sentinela_role(requested_season uuid, accepted public.sentinela_role[])
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.sentinela_memberships m where m.season_id = requested_season and m.profile_id = auth.uid() and m.role = any(accepted)) $$;

create table public.sentinela_onboarding (
  season_id uuid not null references public.sentinela_seasons(id) on delete cascade,
  profile_id uuid not null references auth.users(id) on delete cascade,
  step smallint not null default 1 check (step between 1 and 5),
  answered_call boolean not null default false,
  serves_with_instrument boolean not null default false,
  instrument text,
  avatar_path text,
  diagnosis jsonb not null default '{}'::jsonb,
  primary key (season_id, profile_id),
  check (not serves_with_instrument or nullif(trim(instrument), '') is not null)
);

create table public.sentinela_private_evidence (
  id uuid primary key default gen_random_uuid(), season_id uuid not null references public.sentinela_seasons(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade, body text not null, storage_path text, created_at timestamptz not null default now()
);
create table public.sentinela_journals (
  id uuid primary key default gen_random_uuid(), season_id uuid not null references public.sentinela_seasons(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade, body text not null, created_at timestamptz not null default now()
);
create table public.sentinela_official_progress (
  season_id uuid not null references public.sentinela_seasons(id) on delete cascade, profile_id uuid not null references auth.users(id) on delete cascade,
  educational_xp integer not null default 0 check (educational_xp >= 0), milestone_level integer not null default 0 check (milestone_level >= 0),
  competency integer not null default 0 check (competency between 0 and 100), primary key (season_id, profile_id)
);
create table public.sentinela_checkpoints (
  id uuid primary key default gen_random_uuid(), season_id uuid not null references public.sentinela_seasons(id) on delete cascade,
  profile_id uuid not null references auth.users(id) on delete cascade, requirements jsonb not null default '[]'::jsonb,
  completed_keys jsonb not null default '[]'::jsonb, completed_at timestamptz
);
create table public.sentinela_competency_assessments (
  id uuid primary key default gen_random_uuid(), season_id uuid not null references public.sentinela_seasons(id) on delete cascade,
  profile_id uuid not null references auth.users(id) on delete cascade, assessor_id uuid not null default auth.uid() references auth.users(id),
  score integer not null check (score between 0 and 100), created_at timestamptz not null default now()
);

alter table public.sentinela_seasons enable row level security;
alter table public.sentinela_memberships enable row level security;
alter table public.sentinela_onboarding enable row level security;
alter table public.sentinela_private_evidence enable row level security;
alter table public.sentinela_journals enable row level security;
alter table public.sentinela_official_progress enable row level security;
alter table public.sentinela_checkpoints enable row level security;
alter table public.sentinela_competency_assessments enable row level security;

create policy "members read their seasons" on public.sentinela_seasons for select using (public.is_sentinela_member(id));
create policy "members read memberships in season" on public.sentinela_memberships for select using (public.is_sentinela_member(season_id));
create policy "admins manage memberships" on public.sentinela_memberships for all using (public.has_sentinela_role(season_id, array['coordinator','admin']::public.sentinela_role[])) with check (public.has_sentinela_role(season_id, array['coordinator','admin']::public.sentinela_role[]));
create policy "owners resume onboarding" on public.sentinela_onboarding for all using (profile_id = auth.uid() and public.is_sentinela_member(season_id)) with check (profile_id = auth.uid() and public.is_sentinela_member(season_id));
create policy "owners manage private evidence" on public.sentinela_private_evidence for all using (owner_id = auth.uid() and public.is_sentinela_member(season_id)) with check (owner_id = auth.uid() and public.is_sentinela_member(season_id));
create policy "owners manage private journals" on public.sentinela_journals for all using (owner_id = auth.uid() and public.is_sentinela_member(season_id)) with check (owner_id = auth.uid() and public.is_sentinela_member(season_id));
create policy "members read own progress" on public.sentinela_official_progress for select using (profile_id = auth.uid() and public.is_sentinela_member(season_id));
create policy "authorized roles update official progress" on public.sentinela_official_progress for all using (public.has_sentinela_role(season_id, array['mentor','coordinator','admin']::public.sentinela_role[])) with check (public.has_sentinela_role(season_id, array['mentor','coordinator','admin']::public.sentinela_role[]));
create policy "members read own checkpoints" on public.sentinela_checkpoints for select using (profile_id = auth.uid() and public.is_sentinela_member(season_id));
create policy "authorized roles manage checkpoints" on public.sentinela_checkpoints for all using (public.has_sentinela_role(season_id, array['mentor','coordinator','admin']::public.sentinela_role[])) with check (public.has_sentinela_role(season_id, array['mentor','coordinator','admin']::public.sentinela_role[]));
create policy "members read own assessments" on public.sentinela_competency_assessments for select using (profile_id = auth.uid() and public.is_sentinela_member(season_id));
create policy "authorized roles assess competency" on public.sentinela_competency_assessments for insert with check (assessor_id = auth.uid() and public.has_sentinela_role(season_id, array['mentor','coordinator','admin']::public.sentinela_role[]));

insert into storage.buckets (id, name, public) values ('sentinela-private', 'sentinela-private', false) on conflict (id) do update set public = false;
-- Object names are season-id/user-id/file. A user can only reach their own prefix;
-- season membership prevents carrying the same identity into another season.
create policy "sentinela owners read private storage" on storage.objects for select using (
  bucket_id = 'sentinela-private' and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_sentinela_member(((storage.foldername(name))[1])::uuid)
);
create policy "sentinela owners write private storage" on storage.objects for insert with check (
  bucket_id = 'sentinela-private' and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_sentinela_member(((storage.foldername(name))[1])::uuid)
);
create policy "sentinela owners delete private storage" on storage.objects for delete using (
  bucket_id = 'sentinela-private' and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_sentinela_member(((storage.foldername(name))[1])::uuid)
);
