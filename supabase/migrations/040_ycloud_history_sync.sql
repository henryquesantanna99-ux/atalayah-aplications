-- Durable YCloud ingestion, synchronization checkpoints, and webhook observability.
create table public.ycloud_sync_checkpoints (
  sync_key text primary key, mode text not null check (mode in ('initial','recovery','reconcile')),
  cursor text, window_start timestamptz, window_end timestamptz,
  last_success_at timestamptz, last_error text, metadata jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.ycloud_webhook_events (
  id uuid primary key default gen_random_uuid(), fingerprint text not null unique,
  payload jsonb not null, status text not null default 'pending' check (status in ('pending','processed','failed')),
  attempts integer not null default 0, last_error text, received_at timestamptz not null default now(), processed_at timestamptz
);
create index ycloud_webhook_events_status_received_idx on public.ycloud_webhook_events(status, received_at);

alter table public.ycloud_sync_checkpoints enable row level security;
alter table public.ycloud_webhook_events enable row level security;
create policy "admins inspect ycloud checkpoints" on public.ycloud_sync_checkpoints for select using (public.is_admin());
create policy "admins inspect ycloud webhook events" on public.ycloud_webhook_events for select using (public.is_admin());
