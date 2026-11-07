-- Controlled internal testing access.
-- The allowlist is intentionally data-driven and empty by default.
create table if not exists public.internal_testers (
  email text primary key,
  acesso_ate timestamptz not null,
  criado_em timestamptz not null default now(),
  observacao text
);

alter table public.internal_testers enable row level security;

revoke all on table public.internal_testers from anon, authenticated;

create or replace function public.is_internal_tester()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.internal_testers
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and acesso_ate > now()
  );
$$;

revoke all on function public.is_internal_tester() from public;
grant execute on function public.is_internal_tester() to authenticated;
