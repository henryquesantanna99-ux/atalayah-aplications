-- Commercial CRM, restricted to administrators.
create table public.crm_boards (
  id uuid primary key default gen_random_uuid(), name text not null,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table public.crm_stages (
  id uuid primary key default gen_random_uuid(), board_id uuid not null references public.crm_boards(id) on delete cascade,
  name text not null, color text not null default '#3B82F6', position integer not null default 0
);
create table public.crm_leads (
  id uuid primary key default gen_random_uuid(), board_id uuid not null references public.crm_boards(id) on delete cascade,
  stage_id uuid references public.crm_stages(id) on delete set null, name text not null, company text,
  phone text, email text, source text not null default 'Manual', value numeric(12,2) not null default 0,
  tags text[] not null default '{}', custom_fields jsonb not null default '{}', position integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.crm_contacts (
  id uuid primary key default gen_random_uuid(), phone text not null unique, name text,
  lead_id uuid references public.crm_leads(id) on delete set null, created_at timestamptz not null default now()
);
create table public.crm_messages (
  id uuid primary key default gen_random_uuid(), ycloud_id text unique, contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')), body text, message_type text not null default 'text',
  status text, payload jsonb not null default '{}', sent_at timestamptz not null default now(), created_at timestamptz not null default now()
);

create index crm_leads_board_stage_idx on public.crm_leads(board_id, stage_id);
create index crm_leads_created_at_idx on public.crm_leads(created_at desc);
create index crm_messages_contact_sent_idx on public.crm_messages(contact_id, sent_at desc);

alter table public.crm_boards enable row level security;
alter table public.crm_stages enable row level security;
alter table public.crm_leads enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_messages enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

create policy "admins manage crm boards" on public.crm_boards for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage crm stages" on public.crm_stages for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage crm leads" on public.crm_leads for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage crm contacts" on public.crm_contacts for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage crm messages" on public.crm_messages for all using (public.is_admin()) with check (public.is_admin());
