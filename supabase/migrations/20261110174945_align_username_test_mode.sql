-- The server already controls free-test access through private.app_flags.
-- Username accounts have synthetic Auth emails, so a Gmail-only comparison
-- cannot identify accounts created by the app. Keep the existing explicit
-- email allowlist when free-test mode is off; never trust user_metadata.
grant execute on function private.modo_teste_gratuito() to authenticated;

create or replace function public.is_internal_tester()
returns boolean
language sql
stable
security invoker
set search_path to 'pg_catalog', 'public'
as $function$
  select (select auth.uid()) is not null
    and not coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false)
    and (
      private.modo_teste_gratuito()
      or exists (
        select 1 from public.internal_testers
        where lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
          and acesso_ate > now()
      )
    );
$function$;

revoke all on function public.is_internal_tester() from public, anon;
grant execute on function public.is_internal_tester() to authenticated;
