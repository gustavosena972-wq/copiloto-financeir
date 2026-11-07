-- Security hardening: internal tester lookup must not require SECURITY DEFINER.
-- The client only needs to know whether the authenticated email is an active tester.
-- RLS limits the row visibility to the current authenticated email.

alter table public.internal_testers enable row level security;

drop policy if exists internal_testers_self_read on public.internal_testers;
create policy internal_testers_self_read
  on public.internal_testers
  for select
  to authenticated
  using (lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

create or replace function public.is_internal_tester()
returns boolean
language sql
stable
security invoker
set search_path to 'pg_catalog', 'public'
as $function$
  select exists (
    select 1
    from public.internal_testers
    where lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      and acesso_ate > now()
  );
$function$;

revoke all on function public.is_internal_tester() from public;
grant execute on function public.is_internal_tester() to authenticated;
