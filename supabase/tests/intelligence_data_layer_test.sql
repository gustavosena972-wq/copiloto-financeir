-- Static/integration contract for the intelligence data layer.
-- Execute in a disposable/staging database with migrations applied.

do $$
declare
  v_rls boolean;
begin
  select c.relrowsecurity into v_rls
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='ia_aprendizados';
  if not coalesce(v_rls,false) then
    raise exception 'ia_aprendizados must have RLS enabled';
  end if;

  select c.relrowsecurity into v_rls
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='ia_eventos';
  if not coalesce(v_rls,false) then
    raise exception 'ia_eventos must have RLS enabled';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='ia_aprendizados'
      and policyname='ia_aprendizados_self_read'
  ) then raise exception 'missing ia_aprendizados self-read policy'; end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='ia_eventos'
      and policyname='ia_eventos_self_insert'
  ) then raise exception 'missing ia_eventos self-insert policy'; end if;
end $$;
