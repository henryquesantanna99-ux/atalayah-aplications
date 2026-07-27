create table public.automation_workflows (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id), name text not null,
  published_version_id uuid, created_at timestamptz not null default now()
);
create table public.automation_workflow_versions (
  id uuid primary key default gen_random_uuid(), workflow_id uuid not null references public.automation_workflows(id) on delete cascade,
  version integer not null, definition jsonb not null, published_at timestamptz, created_at timestamptz not null default now(), unique(workflow_id, version)
);
alter table public.automation_workflows add constraint automation_published_version_fk foreign key (published_version_id) references public.automation_workflow_versions(id);
create table public.automation_runs (
  id uuid primary key default gen_random_uuid(), workflow_id uuid not null references public.automation_workflows(id),
  workflow_version_id uuid not null references public.automation_workflow_versions(id), requested_by uuid not null references auth.users(id),
  idempotency_key text not null, input jsonb not null default '{}', output jsonb, status text not null default 'queued' check(status in ('queued','running','succeeded','failed')),
  created_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz, unique(requested_by, workflow_id, idempotency_key)
);
create table public.automation_node_attempts (
  id uuid primary key default gen_random_uuid(), run_id uuid not null references public.automation_runs(id) on delete cascade,
  node_id text not null, node_type text not null, node_version integer not null, attempt integer not null, idempotency_key text not null,
  input jsonb, output jsonb, ports text[], error jsonb, status text not null check(status in ('running','succeeded','failed')),
  created_at timestamptz not null default now(), finished_at timestamptz, unique(run_id,node_id,attempt)
);
create unique index automation_effect_once on public.automation_node_attempts(run_id,idempotency_key) where status='succeeded';
create table public.automation_run_events (
  sequence bigint generated always as identity primary key, run_id uuid not null references public.automation_runs(id) on delete cascade,
  type text not null, payload jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.automation_jobs (
  id bigint generated always as identity primary key, run_id uuid not null unique references public.automation_runs(id) on delete cascade,
  available_at timestamptz not null default now(), lease_until timestamptz, worker_id text, receipt uuid, attempts integer not null default 0,
  last_error text, created_at timestamptz not null default now()
);

alter table public.automation_workflows enable row level security;
alter table public.automation_workflow_versions enable row level security;
alter table public.automation_runs enable row level security;
alter table public.automation_node_attempts enable row level security;
alter table public.automation_run_events enable row level security;
alter table public.automation_jobs enable row level security;
create policy automation_workflows_owner on public.automation_workflows for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy automation_versions_owner on public.automation_workflow_versions for select using(exists(select 1 from public.automation_workflows w where w.id=workflow_id and w.owner_id=auth.uid()));
create policy automation_runs_requester on public.automation_runs for select using(requested_by=auth.uid());
create policy automation_attempts_requester on public.automation_node_attempts for select using(exists(select 1 from public.automation_runs r where r.id=run_id and r.requested_by=auth.uid()));
create policy automation_events_requester on public.automation_run_events for select using(exists(select 1 from public.automation_runs r where r.id=run_id and r.requested_by=auth.uid()));
alter publication supabase_realtime add table public.automation_run_events;

create or replace function public.enqueue_automation_run(p_workflow_id uuid,p_requested_by uuid,p_input jsonb,p_idempotency_key text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_version uuid; v_run uuid;
begin
  if p_requested_by <> auth.uid() then raise exception 'unauthorized' using errcode='42501'; end if;
  select published_version_id into v_version from automation_workflows where id=p_workflow_id and owner_id=p_requested_by for share;
  if v_version is null then raise exception 'workflow publicado não encontrado' using errcode='P0002'; end if;
  insert into automation_runs(workflow_id,workflow_version_id,requested_by,input,idempotency_key) values(p_workflow_id,v_version,p_requested_by,p_input,p_idempotency_key)
    on conflict(requested_by,workflow_id,idempotency_key) do update set idempotency_key=excluded.idempotency_key returning id into v_run;
  insert into automation_jobs(run_id) values(v_run) on conflict(run_id) do nothing;
  insert into automation_run_events(run_id,type,payload) values(v_run,'run.queued','{}') on conflict do nothing;
  return v_run;
end $$;
revoke all on function public.enqueue_automation_run(uuid,uuid,jsonb,text) from public; grant execute on function public.enqueue_automation_run(uuid,uuid,jsonb,text) to authenticated;

create or replace function public.claim_automation_job(p_worker_id text,p_lease_seconds integer default 60) returns table(run_id uuid,receipt uuid) language plpgsql security definer set search_path=public as $$
begin return query update automation_jobs j set worker_id=p_worker_id,receipt=gen_random_uuid(),lease_until=now()+make_interval(secs=>p_lease_seconds),attempts=attempts+1
 where j.id=(select id from automation_jobs where available_at<=now() and (lease_until is null or lease_until<now()) order by id for update skip locked limit 1) returning j.run_id,j.receipt; end $$;
create or replace function public.ack_automation_job(p_receipt uuid) returns void language sql security definer set search_path=public as $$ delete from automation_jobs where receipt=p_receipt $$;
create or replace function public.retry_automation_job(p_receipt uuid,p_delay_seconds integer,p_reason text) returns void language sql security definer set search_path=public as $$ update automation_jobs set available_at=now()+make_interval(secs=>p_delay_seconds),lease_until=null,worker_id=null,receipt=null,last_error=left(p_reason,1000) where receipt=p_receipt $$;
revoke all on function public.claim_automation_job(text,integer),public.ack_automation_job(uuid),public.retry_automation_job(uuid,integer,text) from public,anon,authenticated;
