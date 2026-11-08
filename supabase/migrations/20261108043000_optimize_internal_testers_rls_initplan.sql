-- Otimiza a política RLS de internal_testers para avaliar o JWT uma vez por consulta.
drop policy if exists internal_testers_self_read on public.internal_testers;

create policy internal_testers_self_read
  on public.internal_testers
  for select
  to authenticated
  using (
    lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );
