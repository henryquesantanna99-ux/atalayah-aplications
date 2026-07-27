-- Server-side automation credentials and tenant isolation. Secret key material is
-- intentionally not stored here; ciphertext is produced with AUTOMATION_CREDENTIAL_KEY.
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  primary key (organization_id, user_id)
);

create table public.automation_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('ycloud', 'instagram', 'google-calendar', 'ai', 'http')),
  label text not null,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  key_version integer not null,
  expires_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.automation_workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'active', 'inactive')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Nodes contain non-secret configuration. A credential is referenced only by ID.
create table public.automation_workflow_nodes (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.automation_workflows(id) on delete cascade,
  credential_id uuid references public.automation_credentials(id) on delete restrict,
  provider text not null,
  operation text not null,
  config jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.automation_idempotency (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scoped_key text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, scoped_key)
);

create table public.automation_audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  retain_until timestamptz not null
);

create or replace function public.is_organization_member(target uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.organization_members where organization_id = target and user_id = auth.uid()) $$;

create or replace function public.is_organization_admin(target uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.organization_members where organization_id = target and user_id = auth.uid() and role in ('owner', 'admin')) $$;

create or replace function public.validate_automation_node_tenant() returns trigger
language plpgsql set search_path = public as $$
declare workflow_tenant uuid; credential_tenant uuid;
begin
  select organization_id into workflow_tenant from public.automation_workflows where id = new.workflow_id;
  if new.credential_id is not null then
    select organization_id into credential_tenant from public.automation_credentials where id = new.credential_id;
    if credential_tenant is null or credential_tenant <> workflow_tenant then
      raise exception 'credential and workflow must belong to the same organization';
    end if;
  end if;
  return new;
end $$;

create trigger automation_node_tenant_guard before insert or update on public.automation_workflow_nodes
for each row execute function public.validate_automation_node_tenant();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.automation_credentials enable row level security;
alter table public.automation_workflows enable row level security;
alter table public.automation_workflow_nodes enable row level security;
alter table public.automation_idempotency enable row level security;
alter table public.automation_audit_log enable row level security;

create policy "members read organizations" on public.organizations for select using (public.is_organization_member(id));
create policy "members read organization membership" on public.organization_members for select using (public.is_organization_member(organization_id));
create policy "admins manage organization membership" on public.organization_members for all using (public.is_organization_admin(organization_id)) with check (public.is_organization_admin(organization_id));
create policy "admins manage own tenant credentials" on public.automation_credentials for all using (public.is_organization_admin(organization_id)) with check (public.is_organization_admin(organization_id));
create policy "members read own tenant workflows" on public.automation_workflows for select using (public.is_organization_member(organization_id));
create policy "admins manage own tenant workflows" on public.automation_workflows for all using (public.is_organization_admin(organization_id)) with check (public.is_organization_admin(organization_id));
create policy "members read own tenant nodes" on public.automation_workflow_nodes for select using (exists(select 1 from public.automation_workflows w where w.id = workflow_id and public.is_organization_member(w.organization_id)));
create policy "admins manage own tenant nodes" on public.automation_workflow_nodes for all using (exists(select 1 from public.automation_workflows w where w.id = workflow_id and public.is_organization_admin(w.organization_id))) with check (exists(select 1 from public.automation_workflows w where w.id = workflow_id and public.is_organization_admin(w.organization_id)));
create policy "members read own tenant audits" on public.automation_audit_log for select using (public.is_organization_member(organization_id));

create index automation_credentials_tenant_idx on public.automation_credentials(organization_id, provider);
create index automation_workflows_tenant_idx on public.automation_workflows(organization_id);
create index automation_audit_retention_idx on public.automation_audit_log(retain_until);
