-- Multi-product identity provisioning. Product access is server-owned and is
-- deliberately kept out of auth.users.raw_user_meta_data.

create table if not exists public.user_product_scopes (
  user_id uuid not null references auth.users(id) on delete cascade,
  product text not null check (product in ('main', 'sentinela')),
  created_at timestamptz not null default now(),
  primary key (user_id, product)
);

create table if not exists public.sentinela_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sentinela_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state text not null default 'profile' check (state in ('profile', 'preferences', 'complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_product_scopes enable row level security;
alter table public.sentinela_profiles enable row level security;
alter table public.sentinela_onboarding enable row level security;

create policy "product_scopes_select_own" on public.user_product_scopes
  for select to authenticated using (user_id = auth.uid());
create policy "sentinela_profiles_select_own" on public.sentinela_profiles
  for select to authenticated using (user_id = auth.uid());
create policy "sentinela_profiles_update_own" on public.sentinela_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sentinela_onboarding_select_own" on public.sentinela_onboarding
  for select to authenticated using (user_id = auth.uid());
create policy "sentinela_onboarding_update_own" on public.sentinela_onboarding
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Existing main-product users retain their access during the migration.
insert into public.user_product_scopes (user_id, product)
select id, 'main' from public.profiles
on conflict do nothing;

-- Replaces the old trigger without dropping data. A new user receives main
-- access only from a server-controlled app_metadata marker, or from an OAuth
-- identity (Sentinela intentionally supports email/password only). Client
-- controlled user_metadata is used solely for presentational fields.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_main boolean := coalesce(new.raw_app_meta_data ->> 'provisioning_product', '') = 'main'
    or coalesce(new.raw_app_meta_data ->> 'provider', 'email') <> 'email';
  user_count integer;
  assigned_role text;
  assigned_status text;
begin
  if not is_main then
    return new;
  end if;

  select count(*) into user_count from public.profiles;
  assigned_role := case when user_count = 0 then 'admin' else 'integrante' end;
  assigned_status := case when user_count = 0 then 'active' else 'pending' end;

  insert into public.profiles (id, email, full_name, avatar_url, role, status)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url', assigned_role, assigned_status)
  on conflict (id) do nothing;

  insert into public.user_product_scopes (user_id, product)
  values (new.id, 'main') on conflict do nothing;
  return new;
end;
$$;

-- The sole Sentinela signup completion entry point. It has no user id argument:
-- the target is always the verified JWT subject. All three inserts commit or
-- roll back together and repeated calls return the existing state.
create or replace function public.complete_sentinela_signup()
returns table (product text, onboarding_state text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  insert into public.user_product_scopes (user_id, product)
  values (caller, 'sentinela') on conflict do nothing;
  insert into public.sentinela_profiles (user_id)
  values (caller) on conflict do nothing;
  insert into public.sentinela_onboarding (user_id, state)
  values (caller, 'profile') on conflict do nothing;

  return query select 'sentinela'::text, so.state
    from public.sentinela_onboarding so where so.user_id = caller;
end;
$$;

revoke all on function public.complete_sentinela_signup() from public;
grant execute on function public.complete_sentinela_signup() to authenticated;

