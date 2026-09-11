-- Administrative workflow automation. Secrets live in the external encrypted
-- secret store; this schema only retains opaque references to them.
create table public.automation_workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'inactive', 'archived')),
  published_version integer check (published_version is null or published_version > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, published_version)
);

create table public.automation_workflow_versions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.automation_workflows(id) on delete cascade,
  version integer not null check (version > 0),
  graph_snapshot jsonb not null,
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles(id),
  unique (workflow_id, version),
  unique (workflow_id, id)
);

alter table public.automation_workflows
  add constraint automation_workflows_published_version_fkey
  foreign key (id, published_version)
  references public.automation_workflow_versions(workflow_id, version)
  deferrable initially deferred;

-- Reject common secret-bearing properties at every depth. Values such as tokens
-- must be resolved at runtime through automation_credentials.secret_ref.
create function public.automation_payload_has_no_secrets(payload jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  with recursive values_to_scan(value) as (
    select coalesce(payload, 'null'::jsonb)
    union all
    select child.value
    from values_to_scan parent
    cross join lateral (
      select value from jsonb_each(case when jsonb_typeof(parent.value) = 'object' then parent.value else '{}'::jsonb end)
      union all
      select value from jsonb_array_elements(case when jsonb_typeof(parent.value) = 'array' then parent.value else '[]'::jsonb end)
    ) child
  )
  select not exists (
    select 1
    from values_to_scan
    cross join lateral jsonb_object_keys(
      case when jsonb_typeof(value) = 'object' then value else '{}'::jsonb end
    ) key
    where jsonb_typeof(value) = 'object'
      and lower(key) ~ '(^|_)(token|secret|password|api_key|authorization|cookie)($|_)'
  )
$$;

create table public.automation_nodes (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.automation_workflows(id) on delete cascade,
  node_key text not null,
  node_type text not null,
  position jsonb not null default '{"x":0,"y":0}'::jsonb,
  configuration jsonb not null default '{}'::jsonb check (public.automation_payload_has_no_secrets(configuration)),
  input_ports jsonb not null default '[]'::jsonb,
  output_ports jsonb not null default '[]'::jsonb,
  visual_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workflow_id, id),
  unique (workflow_id, node_key)
);

create table public.automation_edges (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.automation_workflows(id) on delete cascade,
  source_node_id uuid not null,
  target_node_id uuid not null,
  source_port_id text not null,
  target_port_id text not null,
  visual_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_edges_source_node_fkey foreign key (workflow_id, source_node_id)
    references public.automation_nodes(workflow_id, id) on delete cascade,
  constraint automation_edges_target_node_fkey foreign key (workflow_id, target_node_id)
    references public.automation_nodes(workflow_id, id) on delete cascade,
  unique (workflow_id, source_node_id, source_port_id, target_node_id, target_port_id)
);

create table public.automation_credentials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null,
  secret_ref text not null unique check (length(trim(secret_ref)) > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.automation_executions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.automation_workflows(id) on delete cascade,
  workflow_version_id uuid,
  status text not null default 'pending' check (status in ('pending', 'running', 'succeeded', 'failed', 'cancelled')),
  input jsonb check (public.automation_payload_has_no_secrets(input)),
  output jsonb check (public.automation_payload_has_no_secrets(output)),
  error jsonb check (public.automation_payload_has_no_secrets(error)),
  duration_ms bigint check (duration_ms is null or duration_ms >= 0),
  is_test boolean not null default false,
  event_idempotency_key text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint automation_executions_version_fkey foreign key (workflow_id, workflow_version_id)
    references public.automation_workflow_versions(workflow_id, id)
);

create table public.automation_node_executions (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.automation_executions(id) on delete cascade,
  node_key text not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'succeeded', 'failed', 'skipped', 'cancelled')),
  input jsonb check (public.automation_payload_has_no_secrets(input)),
  output jsonb check (public.automation_payload_has_no_secrets(output)),
  error jsonb check (public.automation_payload_has_no_secrets(error)),
  duration_ms bigint check (duration_ms is null or duration_ms >= 0),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (execution_id, node_key)
);

create index automation_workflows_status_idx on public.automation_workflows(status);
create index automation_executions_workflow_created_idx on public.automation_executions(workflow_id, created_at desc);
create unique index automation_executions_idempotency_idx
  on public.automation_executions(workflow_id, event_idempotency_key)
  where event_idempotency_key is not null;
create index automation_node_executions_execution_idx on public.automation_node_executions(execution_id, created_at);

create function public.prevent_automation_version_update()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'Published workflow snapshots are immutable';
end;
$$;
create trigger automation_workflow_versions_immutable
  before update on public.automation_workflow_versions
  for each row execute function public.prevent_automation_version_update();

create trigger automation_workflows_updated_at before update on public.automation_workflows
  for each row execute function public.update_updated_at_column();
create trigger automation_nodes_updated_at before update on public.automation_nodes
  for each row execute function public.update_updated_at_column();
create trigger automation_edges_updated_at before update on public.automation_edges
  for each row execute function public.update_updated_at_column();
create trigger automation_credentials_updated_at before update on public.automation_credentials
  for each row execute function public.update_updated_at_column();

-- Intended for a daily pg_cron/Supabase Cron call. Metadata is retained while
-- potentially sensitive execution payloads and node logs are purged after 30 days.
create function public.purge_old_automation_payloads(retention interval default interval '30 days')
returns bigint language plpgsql security definer set search_path = public as $$
declare affected bigint;
begin
  if retention < interval '1 day' then
    raise exception 'Automation payload retention must be at least one day';
  end if;
  delete from public.automation_node_executions n
    using public.automation_executions e
    where n.execution_id = e.id and e.created_at < now() - retention;
  get diagnostics affected = row_count;
  update public.automation_executions
    set input = null, output = null, error = null
    where created_at < now() - retention
      and (input is not null or output is not null or error is not null);
  return affected;
end;
$$;
revoke all on function public.purge_old_automation_payloads(interval) from public;

alter table public.automation_workflows enable row level security;
alter table public.automation_workflow_versions enable row level security;
alter table public.automation_nodes enable row level security;
alter table public.automation_edges enable row level security;
alter table public.automation_executions enable row level security;
alter table public.automation_node_executions enable row level security;
alter table public.automation_credentials enable row level security;

create policy "admins manage automation workflows" on public.automation_workflows for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage automation workflow versions" on public.automation_workflow_versions for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage automation nodes" on public.automation_nodes for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage automation edges" on public.automation_edges for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage automation executions" on public.automation_executions for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage automation node executions" on public.automation_node_executions for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage automation credentials" on public.automation_credentials for all using (public.is_admin()) with check (public.is_admin());
