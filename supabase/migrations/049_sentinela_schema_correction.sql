-- Incremental repair for installations that received one of the prototype
-- Sentinela schemas. New installations already reach this migration with the
-- canonical season-scoped schema from migrations 045-048.

-- The provisioning workflow has account scope; it must not share a table with
-- journey onboarding, whose identity is (season_id, membership_id).
alter table if exists public.sentinela_signup_onboarding enable row level security;

-- Rehearsal authorization is represented on the canonical membership rather
-- than on profiles or on an alternate rehearsal row shape.
alter table public.sentinela_memberships
  add column if not exists grants text[] not null default '{}';

alter table public.sentinela_memberships
  drop constraint if exists sentinela_memberships_grants_check;
alter table public.sentinela_memberships
  add constraint sentinela_memberships_grants_check
  check (grants <@ array['manage_rehearsals']::text[]);

create or replace function public.has_sentinela_membership(target_season uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.sentinela_memberships
    where season_id = target_season and user_id = auth.uid() and status = 'active'
  )
$$;

create or replace function public.can_manage_sentinela_rehearsals(target_season uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.sentinela_memberships
    where season_id = target_season and user_id = auth.uid() and status = 'active'
      and (role = 'journey_admin' or 'manage_rehearsals' = any(grants))
  )
$$;

revoke all on function public.has_sentinela_membership(uuid) from public;
revoke all on function public.can_manage_sentinela_rehearsals(uuid) from public;
grant execute on function public.has_sentinela_membership(uuid) to authenticated;
grant execute on function public.can_manage_sentinela_rehearsals(uuid) to authenticated;

-- Replace only the prototype policy names. The canonical staff policies from
-- migration 047 remain valid and intentionally coexist with these grants.
drop policy if exists sentinela_rehearsals_member_read on public.sentinela_rehearsals;
drop policy if exists sentinela_rehearsals_manager_insert on public.sentinela_rehearsals;
drop policy if exists sentinela_rehearsals_manager_update on public.sentinela_rehearsals;
drop policy if exists sentinela_rehearsals_manager_delete on public.sentinela_rehearsals;

create policy sentinela_rehearsals_member_read on public.sentinela_rehearsals
  for select using (public.has_sentinela_membership(season_id));
create policy sentinela_rehearsals_manager_insert on public.sentinela_rehearsals
  for insert with check (public.can_manage_sentinela_rehearsals(season_id));
create policy sentinela_rehearsals_manager_update on public.sentinela_rehearsals
  for update using (public.can_manage_sentinela_rehearsals(season_id))
  with check (public.can_manage_sentinela_rehearsals(season_id));
create policy sentinela_rehearsals_manager_delete on public.sentinela_rehearsals
  for delete using (public.can_manage_sentinela_rehearsals(season_id));
