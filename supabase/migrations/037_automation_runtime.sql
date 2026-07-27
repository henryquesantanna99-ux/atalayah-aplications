create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  draft_graph jsonb not null default '{}'::jsonb,
  published_graph jsonb,
  published_revision integer not null default 0,
  created_by uuid not null default auth.uid()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  organization_id uuid not null,
  idempotency_key text not null,
  status text not null,
  unique (automation_id, idempotency_key)
);

alter table public.automations enable row level security;
alter table public.automation_runs enable row level security;

create policy "automation members can read" on public.automations for select to authenticated
using (organization_id = public.current_user_organization_id());
create policy "automation members can write" on public.automations for all to authenticated
using (organization_id = public.current_user_organization_id())
with check (organization_id = public.current_user_organization_id());
create policy "automation run members can read" on public.automation_runs for select to authenticated
using (organization_id = public.current_user_organization_id());
create policy "automation run members can write" on public.automation_runs for all to authenticated
using (organization_id = public.current_user_organization_id())
with check (organization_id = public.current_user_organization_id());
