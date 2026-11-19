-- SECURITY INVOKER keeps the existing self-read policy in force.
-- Only the two columns required to validate the caller's internal-test access.
grant select (email, acesso_ate) on public.internal_testers to authenticated;
