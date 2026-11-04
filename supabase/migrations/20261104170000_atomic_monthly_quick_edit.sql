-- Atualização atômica dos valores editados no resumo mensal.
-- Toda a operação ocorre em uma única transação PostgreSQL e mantém os gatilhos
-- de auditoria, bloqueio de mês fechado e atualização de timestamps.

create or replace function private.salvar_valores_lancamentos(
  p_familia uuid,
  p_mes uuid,
  p_itens jsonb
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_quantidade integer;
  v_atualizados integer;
begin
  if auth.uid() is null then
    raise exception 'autenticação obrigatória' using errcode = '42501';
  end if;

  if p_familia is null or p_mes is null
     or p_itens is null
     or jsonb_typeof(p_itens) <> 'array'
     or jsonb_array_length(p_itens) < 1
     or jsonb_array_length(p_itens) > 1000 then
    raise exception 'parâmetros de edição inválidos' using errcode = '22023';
  end if;

  if not private.pode_editar(p_familia) then
    raise exception 'sem permissão para editar esta família' using errcode = '42501';
  end if;

  -- Serializa a edição com o fechamento do mês.
  perform 1
    from public.meses
   where id = p_mes
     and familia_id = p_familia
     and status = 'aberto'
   for update;

  if not found then
    raise exception 'mês inexistente, fechado ou não pertence à família' using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_itens) as item
     where jsonb_typeof(item) <> 'object'
        or jsonb_typeof(item->'id') <> 'string'
        or jsonb_typeof(item->'valor') <> 'number'
        or (item->>'valor')::numeric < 0
  ) then
    raise exception 'cada item precisa conter id e valor numérico não negativo' using errcode = '22023';
  end if;

  select count(*), count(distinct x.id)
    into v_quantidade, v_atualizados
    from jsonb_to_recordset(p_itens) as x(id uuid, valor numeric);

  if v_quantidade <> jsonb_array_length(p_itens)
     or v_atualizados <> v_quantidade then
    raise exception 'lista de lançamentos inválida ou com IDs duplicados' using errcode = '22023';
  end if;

  if (
    select count(*)
      from jsonb_to_recordset(p_itens) as x(id uuid, valor numeric)
      join public.lancamentos l
        on l.id = x.id
       and l.familia_id = p_familia
       and l.mes_id = p_mes
  ) <> v_quantidade then
    raise exception 'um ou mais lançamentos não pertencem a este mês e família' using errcode = '42501';
  end if;

  update public.lancamentos l
     set valor = x.valor
    from jsonb_to_recordset(p_itens) as x(id uuid, valor numeric)
   where l.id = x.id
     and l.familia_id = p_familia
     and l.mes_id = p_mes;

  get diagnostics v_atualizados = row_count;

  if v_atualizados <> v_quantidade then
    raise exception 'não foi possível atualizar todos os lançamentos' using errcode = '40001';
  end if;

  return v_atualizados;
end;
$function$;

revoke all on function private.salvar_valores_lancamentos(uuid, uuid, jsonb) from public, anon;
grant execute on function private.salvar_valores_lancamentos(uuid, uuid, jsonb) to authenticated;

create or replace function public.salvar_valores_lancamentos(
  p_familia uuid,
  p_mes uuid,
  p_itens jsonb
)
returns integer
language sql
security invoker
set search_path = pg_catalog, public, private
as $function$
  select private.salvar_valores_lancamentos(p_familia, p_mes, p_itens);
$function$;

revoke all on function public.salvar_valores_lancamentos(uuid, uuid, jsonb) from public, anon;
grant execute on function public.salvar_valores_lancamentos(uuid, uuid, jsonb) to authenticated;
