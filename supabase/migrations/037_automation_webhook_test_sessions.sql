-- Webhook workflows, single-use test sessions and execution telemetry.
create type public.automation_test_session_state as enum ('waiting', 'claimed', 'completed', 'failed');
create type public.automation_execution_state as enum ('running', 'completed', 'failed');
create type public.automation_node_execution_state as enum ('running', 'completed', 'skipped', 'failed');

create table public.automation_workflows (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  draft_definition jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  published_definition jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.automation_executions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.automation_workflows(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  test_session_id uuid,
  mode text not null check (mode in ('test', 'production')),
  state public.automation_execution_state not null default 'running',
  definition_snapshot jsonb not null,
  trigger_input jsonb,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.automation_webhook_test_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (length(token_hash) = 64),
  workflow_id uuid not null references public.automation_workflows(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  state public.automation_test_session_state not null default 'waiting',
  claimed_at timestamptz,
  execution_id uuid references public.automation_executions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_test_session_claim_consistency check (
    (state = 'waiting' and claimed_at is null) or (state <> 'waiting' and claimed_at is not null)
  )
);

alter table public.automation_executions
  add constraint automation_executions_test_session_fk
  foreign key (test_session_id) references public.automation_webhook_test_sessions(id) on delete set null;

create unique index automation_one_waiting_session_per_user_workflow
  on public.automation_webhook_test_sessions(workflow_id, user_id)
  where state = 'waiting';

create table public.automation_node_executions (
  id bigint generated always as identity primary key,
  execution_id uuid not null references public.automation_executions(id) on delete cascade,
  node_id text not null,
  state public.automation_node_execution_state not null,
  sanitized_input jsonb,
  sanitized_output jsonb,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.automation_webhook_rate_limits (
  bucket text primary key,
  request_count integer not null default 0,
  window_started_at timestamptz not null default now()
);

-- The row lock and conditional update make consuming a test URL atomic. The
-- plaintext token is never accepted by or persisted in this function.
create or replace function public.claim_automation_webhook_test_session(p_token_hash text)
returns table (session_id uuid, workflow_id uuid, user_id uuid, execution_id uuid)
language plpgsql security definer set search_path = public
as $$
declare claimed public.automation_webhook_test_sessions%rowtype;
begin
  select * into claimed
    from public.automation_webhook_test_sessions
   where token_hash = p_token_hash
   for update;

  if not found or claimed.state <> 'waiting' or claimed.expires_at <= now() then
    return;
  end if;

  update public.automation_webhook_test_sessions
     set state = 'claimed', claimed_at = now(), updated_at = now()
   where id = claimed.id and state = 'waiting'
   returning * into claimed;

  if found then
    return query select claimed.id, claimed.workflow_id, claimed.user_id, claimed.execution_id;
  end if;
end;
$$;

create or replace function public.consume_automation_webhook_rate_limit(
  p_bucket text, p_limit integer, p_window_seconds integer
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare allowed boolean;
begin
  insert into public.automation_webhook_rate_limits as limits(bucket, request_count, window_started_at)
  values (p_bucket, 1, now())
  on conflict (bucket) do update set
    request_count = case
      when limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
      else limits.request_count + 1 end,
    window_started_at = case
      when limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
      else limits.window_started_at end
  returning request_count <= p_limit into allowed;
  return allowed;
end;
$$;

alter table public.automation_workflows enable row level security;
alter table public.automation_executions enable row level security;
alter table public.automation_webhook_test_sessions enable row level security;
alter table public.automation_node_executions enable row level security;
alter table public.automation_webhook_rate_limits enable row level security;

create policy "owners manage workflows" on public.automation_workflows
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners read executions" on public.automation_executions
  for select using (user_id = auth.uid());
create policy "owners read test sessions" on public.automation_webhook_test_sessions
  for select using (user_id = auth.uid());
create policy "owners read node telemetry" on public.automation_node_executions
  for select using (exists (
    select 1 from public.automation_executions e where e.id = execution_id and e.user_id = auth.uid()
  ));

revoke all on function public.claim_automation_webhook_test_session(text) from public, anon, authenticated;
revoke all on function public.consume_automation_webhook_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_automation_webhook_test_session(text) to service_role;
grant execute on function public.consume_automation_webhook_rate_limit(text, integer, integer) to service_role;

alter publication supabase_realtime add table public.automation_webhook_test_sessions;
alter publication supabase_realtime add table public.automation_executions;
alter publication supabase_realtime add table public.automation_node_executions;
