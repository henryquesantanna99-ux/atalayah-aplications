-- Sentinela is season-scoped. Time (phases/weeks) is deliberately independent
-- from competency (milestones/levels/progress).
create table public.sentinela_seasons (
  id uuid primary key default gen_random_uuid(), name text not null,
  slug text not null unique, starts_on date not null, ends_on date not null,
  status text not null default 'draft' check (status in ('draft','published','active','completed','archived')),
  is_public boolean not null default false, created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table public.sentinela_memberships (
  id uuid primary key default gen_random_uuid(), season_id uuid not null references public.sentinela_seasons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('participant','mentor','journey_admin')),
  status text not null default 'invited' check (status in ('invited','active','paused','completed','removed')),
  joined_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (season_id,user_id,role), unique (season_id,id)
);
create index sentinela_memberships_user_season_status_idx on public.sentinela_memberships(user_id,season_id,status);
create index sentinela_memberships_season_role_status_idx on public.sentinela_memberships(season_id,role,status);

-- SECURITY DEFINER avoids querying the RLS-protected memberships relation from
-- its own policies. Execution is pinned to public and inputs are explicit.
create function public.sentinela_has_membership(p_season_id uuid, p_roles text[] default null)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.sentinela_memberships m where m.season_id=p_season_id and m.user_id=auth.uid() and m.status='active' and (p_roles is null or m.role=any(p_roles))) $$;
create function public.sentinela_is_staff(p_season_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.sentinela_has_membership(p_season_id,array['mentor','journey_admin']) $$;
revoke all on function public.sentinela_has_membership(uuid,text[]) from public;
revoke all on function public.sentinela_is_staff(uuid) from public;
grant execute on function public.sentinela_has_membership(uuid,text[]), public.sentinela_is_staff(uuid) to authenticated;

create table public.sentinela_phases (
  id uuid primary key default gen_random_uuid(), season_id uuid not null references public.sentinela_seasons(id) on delete cascade,
  name text not null, position integer not null check(position>0), starts_on date, ends_on date,
  description text, status text not null default 'draft' check(status in ('draft','published','completed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(season_id,position), unique(season_id,id), check(ends_on is null or starts_on is null or ends_on>=starts_on)
);
create table public.sentinela_weeks (
  id uuid primary key default gen_random_uuid(), season_id uuid not null, phase_id uuid not null,
  week_number integer not null check(week_number>0), title text not null, starts_on date not null, ends_on date not null,
  status text not null default 'draft' check(status in ('draft','published','completed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(season_id,week_number), unique(season_id,id),
  foreign key(season_id,phase_id) references public.sentinela_phases(season_id,id) on delete cascade, check(ends_on>=starts_on)
);

create table public.sentinela_milestones (
 id uuid primary key default gen_random_uuid(), season_id uuid not null references public.sentinela_seasons(id) on delete cascade,
 name text not null, description text, position integer not null check(position>0), status text not null default 'draft' check(status in ('draft','published','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(season_id,position), unique(season_id,id)
);
create table public.sentinela_levels (
 id uuid primary key default gen_random_uuid(), season_id uuid not null, milestone_id uuid not null, name text not null,
 rank integer not null check(rank>=0), description text, criteria jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(milestone_id,rank), unique(season_id,id),
 foreign key(season_id,milestone_id) references public.sentinela_milestones(season_id,id) on delete cascade
);
create table public.sentinela_competency_progress (
 id uuid primary key default gen_random_uuid(), season_id uuid not null, membership_id uuid not null, milestone_id uuid not null,
 official_level_id uuid, self_assessment jsonb not null default '{}', mentor_assessment jsonb not null default '{}',
 official_updated_by uuid references public.profiles(id), official_updated_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(membership_id,milestone_id),
 foreign key(season_id,membership_id) references public.sentinela_memberships(season_id,id) on delete cascade,
 foreign key(season_id,milestone_id) references public.sentinela_milestones(season_id,id) on delete cascade,
 foreign key(season_id,official_level_id) references public.sentinela_levels(season_id,id)
);

create table public.sentinela_responsibilities (
 id uuid primary key default gen_random_uuid(), season_id uuid not null references public.sentinela_seasons(id) on delete cascade,
 name text not null, description text, configuration jsonb not null default '{}', active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(season_id,name), unique(season_id,id)
);
create table public.sentinela_squads (
 id uuid primary key default gen_random_uuid(), season_id uuid not null, phase_id uuid not null, name text not null,
 status text not null default 'active' check(status in ('draft','active','closed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(phase_id,name), unique(season_id,id),
 foreign key(season_id,phase_id) references public.sentinela_phases(season_id,id) on delete cascade
);
create table public.sentinela_squad_members (
 id uuid primary key default gen_random_uuid(), season_id uuid not null, squad_id uuid not null, membership_id uuid not null,
 responsibility_id uuid, starts_at timestamptz not null default now(), ends_at timestamptz,
 created_at timestamptz not null default now(), unique(squad_id,membership_id),
 foreign key(season_id,squad_id) references public.sentinela_squads(season_id,id) on delete cascade,
 foreign key(season_id,membership_id) references public.sentinela_memberships(season_id,id) on delete cascade,
 foreign key(season_id,responsibility_id) references public.sentinela_responsibilities(season_id,id), check(ends_at is null or ends_at>=starts_at)
);
create table public.sentinela_missions (
 id uuid primary key default gen_random_uuid(), season_id uuid not null references public.sentinela_seasons(id) on delete cascade,
 phase_id uuid, week_id uuid, title text not null, description text, status text not null default 'draft' check(status in ('draft','published','closed','archived')),
 assignment_mode text not null default 'individual' check(assignment_mode in ('individual','squad','either')), due_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(season_id,id),
 foreign key(season_id,phase_id) references public.sentinela_phases(season_id,id), foreign key(season_id,week_id) references public.sentinela_weeks(season_id,id)
);
create table public.sentinela_mission_assignments (
 id uuid primary key default gen_random_uuid(), season_id uuid not null, mission_id uuid not null, membership_id uuid, squad_id uuid,
 status text not null default 'assigned' check(status in ('assigned','in_progress','submitted','completed','cancelled')),
 response jsonb not null default '{}', submitted_at timestamptz, reviewed_by uuid references public.profiles(id), reviewed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(season_id,mission_id) references public.sentinela_missions(season_id,id) on delete cascade,
 foreign key(season_id,membership_id) references public.sentinela_memberships(season_id,id) on delete cascade,
 foreign key(season_id,squad_id) references public.sentinela_squads(season_id,id) on delete cascade,
 check((membership_id is null)<>(squad_id is null))
);

-- Reusable indexes for the primary authorization and filtering dimensions.
create index sentinela_phases_season_status_idx on public.sentinela_phases(season_id,status);
create index sentinela_weeks_season_status_idx on public.sentinela_weeks(season_id,status);
create index sentinela_progress_membership_season_idx on public.sentinela_competency_progress(membership_id,season_id);
create index sentinela_assignments_membership_status_idx on public.sentinela_mission_assignments(membership_id,season_id,status);
create index sentinela_assignments_squad_status_idx on public.sentinela_mission_assignments(squad_id,season_id,status);

do $$ declare t text; begin foreach t in array array['sentinela_seasons','sentinela_memberships','sentinela_phases','sentinela_weeks','sentinela_milestones','sentinela_levels','sentinela_competency_progress','sentinela_responsibilities','sentinela_squads','sentinela_squad_members','sentinela_missions','sentinela_mission_assignments'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;

create policy "members read seasons" on public.sentinela_seasons for select using(is_public or public.sentinela_has_membership(id));
create policy "admins manage seasons" on public.sentinela_seasons for all using(public.sentinela_has_membership(id,array['journey_admin'])) with check(public.sentinela_has_membership(id,array['journey_admin']));
create policy "members read memberships" on public.sentinela_memberships for select using(user_id=auth.uid() or public.sentinela_is_staff(season_id));
create policy "admins manage memberships" on public.sentinela_memberships for all using(public.sentinela_has_membership(season_id,array['journey_admin'])) with check(public.sentinela_has_membership(season_id,array['journey_admin']));

-- Published journey/competency definitions are collective; writes are staff-only.
do $$ declare t text; begin foreach t in array array['sentinela_phases','sentinela_weeks','sentinela_milestones','sentinela_levels','sentinela_missions'] loop
 execute format('create policy "members read %1$s" on public.%1$I for select using(public.sentinela_has_membership(season_id) and status <> ''draft'')',t);
 execute format('create policy "staff manage %1$s" on public.%1$I for all using(public.sentinela_is_staff(season_id)) with check(public.sentinela_is_staff(season_id))',t); end loop; end $$;
do $$ declare t text; begin foreach t in array array['sentinela_responsibilities','sentinela_squads','sentinela_squad_members'] loop
 execute format('create policy "members read %1$s" on public.%1$I for select using(public.sentinela_has_membership(season_id))',t);
 execute format('create policy "staff manage %1$s" on public.%1$I for all using(public.sentinela_is_staff(season_id)) with check(public.sentinela_is_staff(season_id))',t); end loop; end $$;
create policy "participant reads own competency" on public.sentinela_competency_progress for select using(public.sentinela_is_staff(season_id) or exists(select 1 from public.sentinela_memberships m where m.id=membership_id and m.user_id=auth.uid()));
create policy "staff manages competency" on public.sentinela_competency_progress for all using(public.sentinela_is_staff(season_id)) with check(public.sentinela_is_staff(season_id));
create policy "assignees read assignments" on public.sentinela_mission_assignments for select using(public.sentinela_is_staff(season_id) or exists(select 1 from public.sentinela_memberships m where m.id=membership_id and m.user_id=auth.uid()) or exists(select 1 from public.sentinela_squad_members sm join public.sentinela_memberships m on m.id=sm.membership_id where sm.squad_id=squad_id and m.user_id=auth.uid()));
create policy "participants update own assignments" on public.sentinela_mission_assignments for update using(exists(select 1 from public.sentinela_memberships m where m.id=membership_id and m.user_id=auth.uid() and m.status='active')) with check(exists(select 1 from public.sentinela_memberships m where m.id=membership_id and m.user_id=auth.uid() and m.status='active') and reviewed_by is null and reviewed_at is null);
create policy "staff manage assignments" on public.sentinela_mission_assignments for all using(public.sentinela_is_staff(season_id)) with check(public.sentinela_is_staff(season_id));
