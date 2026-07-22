-- Upgrade installations where the initial CRM migration was already applied.
create table if not exists public.crm_sources (
  id uuid primary key default gen_random_uuid(), board_id uuid not null references public.crm_boards(id) on delete cascade,
  name text not null, color text not null default '#3B82F6', created_at timestamptz not null default now(), unique(board_id, name)
);
create table if not exists public.crm_tags (
  id uuid primary key default gen_random_uuid(), board_id uuid not null references public.crm_boards(id) on delete cascade,
  name text not null, color text not null default '#3B82F6', created_at timestamptz not null default now(), unique(board_id, name)
);
create table if not exists public.crm_custom_fields (
  id uuid primary key default gen_random_uuid(), board_id uuid not null references public.crm_boards(id) on delete cascade,
  name text not null, field_type text not null check (field_type in ('text','number','phone','currency','date','email','select')),
  options jsonb not null default '[]', position integer not null default 0, created_at timestamptz not null default now()
);
alter table public.crm_leads add column if not exists source_id uuid references public.crm_sources(id) on delete set null;
alter table public.crm_leads add column if not exists tag_ids uuid[] not null default '{}';
alter table public.crm_leads alter column value drop not null;
alter table public.crm_sources enable row level security;
alter table public.crm_tags enable row level security;
alter table public.crm_custom_fields enable row level security;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='crm_sources' and policyname='admins manage crm sources') then
    create policy "admins manage crm sources" on public.crm_sources for all using (public.is_admin()) with check (public.is_admin());
    create policy "admins manage crm tags" on public.crm_tags for all using (public.is_admin()) with check (public.is_admin());
    create policy "admins manage crm custom fields" on public.crm_custom_fields for all using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;
