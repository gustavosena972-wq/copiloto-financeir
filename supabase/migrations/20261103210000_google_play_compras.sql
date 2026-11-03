-- Migration revisada para o fluxo isolado de compras Google Play.
-- Não altera tabelas ou RPCs do checkout Pix.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.google_play_compras (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete restrict,
  usuario_id uuid not null references public.perfis(id) on delete restrict,
  produto_id text not null check (produto_id in ('copiloto_pro_30d','copiloto_max_30d','copiloto_ultra_30d')),
  plano text not null check (plano in ('pro','max','ultra')),
  valor numeric(10,2) not null check (valor in (23.90,35.90,59.90)),
  pacote text not null,
  pedido_google text,
  token_compra text not null,
  token_hash text not null unique,
  comprado_em timestamptz,
  status text not null default 'pendente' check (status in ('pendente','aprovado','recusado')),
  nota text,
  criado_em timestamptz not null default now(),
  decidido_em timestamptz,
  decidido_por uuid references public.perfis(id)
);

alter table public.google_play_compras enable row level security;
revoke all on public.google_play_compras from public, anon, authenticated;
grant all on public.google_play_compras to service_role;

create or replace function private.admin_listar_compras_google_play(p_status text default 'pendente')
returns table(
  id uuid, familia text, email text, produto_id text, plano text,
  valor numeric, pedido_google text, status text, criado_em timestamptz,
  acesso_ate timestamptz
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.eh_admin() then
    raise exception 'sem permissão';
  end if;
  return query
    select g.id, f.nome, u.email::text, g.produto_id, g.plano,
           g.valor, g.pedido_google, g.status, g.criado_em, f.acesso_ate
    from public.google_play_compras g
    join public.familias f on f.id = g.familia_id
    left join auth.users u on u.id = g.usuario_id
    where p_status = 'todos' or g.status = p_status
    order by g.criado_em desc
    limit 200;
end;
$$;

create or replace function private.aprovar_compra_google_play(p_id uuid, p_dias integer default 30)
returns timestamptz
language plpgsql security definer
set search_path = public
as $$
declare compra public.google_play_compras; novo timestamptz;
begin
  if auth.uid() is null or not public.eh_admin() then raise exception 'sem permissão'; end if;
  if p_dias is null or p_dias <> 30 then raise exception 'compras Google Play concedem exatamente 30 dias'; end if;
  select * into compra from public.google_play_compras where id=p_id and status='pendente' for update;
  if not found then raise exception 'compra não encontrada ou já decidida'; end if;
  update public.familias
    set plano=compra.plano,
        acesso_ate=greatest(coalesce(acesso_ate,now()),now()) + interval '30 days'
    where id=compra.familia_id
    returning acesso_ate into novo;
  if not found then raise exception 'família não encontrada'; end if;
  update public.google_play_compras
    set status='aprovado', decidido_em=now(), decidido_por=auth.uid()
    where id=p_id;
  return novo;
end;
$$;

create or replace function private.recusar_compra_google_play(p_id uuid, p_nota text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.eh_admin() then raise exception 'sem permissão'; end if;
  update public.google_play_compras
    set status='recusado', nota=left(coalesce(p_nota,'Compra reembolsada pela Google Play.'),300),
        decidido_em=now(), decidido_por=auth.uid()
    where id=p_id and status='pendente';
  if not found then raise exception 'compra não encontrada ou já decidida'; end if;
end;
$$;

create or replace function public.admin_listar_compras_google_play(p_status text default 'pendente')
returns table(
  id uuid, familia text, email text, produto_id text, plano text,
  valor numeric, pedido_google text, status text, criado_em timestamptz,
  acesso_ate timestamptz
)
language sql
set search_path = public, private
as $$ select * from private.admin_listar_compras_google_play($1) $$;

create or replace function public.aprovar_compra_google_play(p_id uuid, p_dias integer default 30)
returns timestamptz
language sql
set search_path = public, private
as $$ select private.aprovar_compra_google_play($1,$2) $$;

create or replace function public.recusar_compra_google_play(p_id uuid, p_nota text default null)
returns void
language sql
set search_path = public, private
as $$ select private.recusar_compra_google_play($1,$2) $$;

revoke all on function private.admin_listar_compras_google_play(text) from public, anon;
revoke all on function private.aprovar_compra_google_play(uuid,integer) from public, anon;
revoke all on function private.recusar_compra_google_play(uuid,text) from public, anon;
grant execute on function private.admin_listar_compras_google_play(text) to authenticated;
grant execute on function private.aprovar_compra_google_play(uuid,integer) to authenticated;
grant execute on function private.recusar_compra_google_play(uuid,text) to authenticated;

revoke all on function public.admin_listar_compras_google_play(text) from public, anon;
revoke all on function public.aprovar_compra_google_play(uuid,integer) from public, anon;
revoke all on function public.recusar_compra_google_play(uuid,text) from public, anon;
grant execute on function public.admin_listar_compras_google_play(text) to authenticated;
grant execute on function public.aprovar_compra_google_play(uuid,integer) to authenticated;
grant execute on function public.recusar_compra_google_play(uuid,text) to authenticated;
