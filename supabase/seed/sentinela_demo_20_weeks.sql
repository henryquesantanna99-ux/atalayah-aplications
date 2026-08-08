-- OPT-IN LOCAL SEED ONLY. Run explicitly after migrations; never in production.
insert into public.sentinela_seasons(id,name,slug,starts_on,ends_on,status,is_public)
values('00000000-0000-4000-8000-000000000020','Sentinela Demo — 20 semanas','sentinela-demo-20','2026-01-05','2026-05-24','published',false)
on conflict(slug) do nothing;

insert into public.sentinela_phases(id,season_id,name,position,starts_on,ends_on,status)
select gen_random_uuid(),'00000000-0000-4000-8000-000000000020',format('Fase %s',n),n,
       date '2026-01-05'+((n-1)*35), date '2026-01-05'+(n*35-1),'published'
from generate_series(1,4) n on conflict(season_id,position) do nothing;

insert into public.sentinela_weeks(season_id,phase_id,week_number,title,starts_on,ends_on,status)
select '00000000-0000-4000-8000-000000000020',p.id,n,format('Semana %s',n),
       date '2026-01-05'+((n-1)*7),date '2026-01-05'+(n*7-1),'published'
from generate_series(1,20) n join public.sentinela_phases p on p.season_id='00000000-0000-4000-8000-000000000020' and p.position=((n-1)/5)+1
on conflict(season_id,week_number) do nothing;
