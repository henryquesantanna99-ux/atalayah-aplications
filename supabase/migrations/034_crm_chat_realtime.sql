-- Stream new contacts and messages to the admin chat without page refreshes.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crm_contacts'
  ) then alter publication supabase_realtime add table public.crm_contacts; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crm_messages'
  ) then alter publication supabase_realtime add table public.crm_messages; end if;
end $$;
