-- Service price and estimated direct cost are captured together with the sale.
alter table public.lancamentos
  add column servico_catalogo_id uuid,
  add column servico_custo_direto numeric check (servico_custo_direto >= 0);

create function public.registrar_atendimento(p_familia uuid, p_mes uuid, p_servico uuid, p_evento uuid, p_dia date)
returns uuid language plpgsql security invoker set search_path = pg_catalog,public as $$
declare
  s public.negocio_servicos%rowtype;
  gravado uuid;
begin
  if auth.uid() is null or not public.is_internal_tester() or not private.pode_editar(p_familia) then
    raise exception 'Sem acesso para registrar atendimento' using errcode='42501';
  end if;
  select id into gravado from public.lancamentos where id=p_evento and familia_id=p_familia
    and mes_id=p_mes and servico_catalogo_id=p_servico and criado_por=auth.uid();
  if found then return gravado; end if;
  if p_dia is null or p_evento is null or abs(p_dia-current_date)>1 or not exists (
    select 1 from public.meses m join public.anos a on a.id=m.ano_id
    where m.id=p_mes and m.familia_id=p_familia and a.familia_id=p_familia and m.status='aberto'
      and a.status='aberto' and m.mes=extract(month from p_dia) and a.ano=extract(year from p_dia)
  ) then raise exception 'Abra o mês atual para registrar o atendimento'; end if;
  select * into strict s from public.negocio_servicos where id=p_servico and familia_id=p_familia and ativo;
  if s.preco<=0 then raise exception 'Defina o preço do serviço no catálogo'; end if;
  insert into public.lancamentos(id,familia_id,mes_id,descricao,valor,tipo,status,data_pagamento,data_vencimento,
    criado_por,servico_catalogo_id,servico_custo_direto)
  values (p_evento,p_familia,p_mes,s.nome,s.preco,'receita','pago',p_dia,p_dia,auth.uid(),s.id,
    round(s.materiais+s.minutos*s.custo_hora/60+s.preco*s.taxas/100,2))
  on conflict (id) do nothing returning id into gravado;
  if gravado is null then
    select id into strict gravado from public.lancamentos where id=p_evento and familia_id=p_familia
      and mes_id=p_mes and servico_catalogo_id=p_servico and criado_por=auth.uid();
  end if;
  return gravado;
end; $$;
revoke all on function public.registrar_atendimento(uuid,uuid,uuid,uuid,date) from public,anon;
grant execute on function public.registrar_atendimento(uuid,uuid,uuid,uuid,date) to authenticated;
