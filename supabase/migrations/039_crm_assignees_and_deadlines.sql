-- Assign CRM work to members from the Team menu and expose only their work.
alter table public.crm_leads
  add column if not exists assignee_id uuid references public.profiles(id) on delete set null,
  add column if not exists due_date date;

create index if not exists crm_leads_assignee_idx on public.crm_leads(assignee_id, board_id, stage_id);

drop policy if exists "members read assigned crm boards" on public.crm_boards;
drop policy if exists "members read assigned crm stages" on public.crm_stages;
drop policy if exists "members read assigned crm sources" on public.crm_sources;
drop policy if exists "members read assigned crm tags" on public.crm_tags;
drop policy if exists "members read assigned crm custom fields" on public.crm_custom_fields;
drop policy if exists "members read assigned crm leads" on public.crm_leads;

create policy "members read assigned crm leads" on public.crm_leads for select
  using (assignee_id = auth.uid());
create policy "members read assigned crm boards" on public.crm_boards for select
  using (exists(select 1 from public.crm_leads lead where lead.board_id = id and lead.assignee_id = auth.uid()));
create policy "members read assigned crm stages" on public.crm_stages for select
  using (exists(select 1 from public.crm_leads lead where lead.stage_id = id and lead.assignee_id = auth.uid()));
create policy "members read assigned crm sources" on public.crm_sources for select
  using (exists(select 1 from public.crm_leads lead where lead.board_id = crm_sources.board_id and lead.assignee_id = auth.uid()));
create policy "members read assigned crm tags" on public.crm_tags for select
  using (exists(select 1 from public.crm_leads lead where lead.board_id = crm_tags.board_id and lead.assignee_id = auth.uid()));
create policy "members read assigned crm custom fields" on public.crm_custom_fields for select
  using (exists(select 1 from public.crm_leads lead where lead.board_id = crm_custom_fields.board_id and lead.assignee_id = auth.uid()));
