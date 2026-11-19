-- Called by the purchase Edge Function only after Google verifies the token.
-- A row lock makes retries and concurrent confirmations idempotent.
create function public.ativar_compra_google_play_verificada(
  p_compra uuid, p_usuario uuid, p_familia uuid
) returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  compra public.google_play_compras;
  vencimento timestamptz;
begin
  select * into compra from public.google_play_compras
    where id = p_compra and usuario_id = p_usuario and familia_id = p_familia
    for update;
  if not found then raise exception 'compra fora do escopo'; end if;
  if not exists (select 1 from public.membros where usuario_id=p_usuario and familia_id=p_familia) then
    raise exception 'vínculo familiar inválido';
  end if;
  if compra.status = 'aprovado' then
    select acesso_ate into vencimento from public.familias where id=p_familia;
    return vencimento;
  end if;
  if compra.status <> 'pendente' then raise exception 'compra não elegível'; end if;
  update public.familias
    set plano=compra.plano,
        acesso_ate=greatest(coalesce(acesso_ate, now()), now()) + interval '30 days'
    where id=p_familia returning acesso_ate into vencimento;
  if not found then raise exception 'família inexistente'; end if;
  update public.google_play_compras
    set status='aprovado', decidido_em=now(), nota='Ativação automática Google Play'
    where id=p_compra;
  return vencimento;
end;
$$;
revoke all on function public.ativar_compra_google_play_verificada(uuid,uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.ativar_compra_google_play_verificada(uuid,uuid,uuid) to service_role;
