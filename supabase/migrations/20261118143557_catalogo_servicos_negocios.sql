-- Alpha service catalog. Prices are calculated by the database, never trusted from a client.
create table public.negocio_servicos (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  nome text not null check (length(btrim(nome)) between 1 and 120),
  materiais numeric(12,2) not null check (materiais between 0 and 1000000),
  minutos integer not null check (minutos between 0 and 1440),
  custo_hora numeric(12,2) not null check (custo_hora between 0 and 1000000),
  custo_fixo numeric(12,2) not null check (custo_fixo between 0 and 1000000),
  taxas numeric(5,2) not null check (taxas between 0 and 99.99),
  margem numeric(5,2) not null check (margem between 0 and 99.99 and margem+taxas<100),
  preco numeric generated always as (ceil((materiais+minutos/60.0*custo_hora+custo_fixo)/(1-(taxas+margem)/100)*100)/100) stored,
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now()
);
create unique index negocio_servicos_nome_ativo on public.negocio_servicos(familia_id,lower(btrim(nome))) where ativo;
alter table public.negocio_servicos enable row level security;
create policy servicos_do_espaco on public.negocio_servicos for select to authenticated
  using (private.eh_membro(familia_id) and public.is_internal_tester() and exists (
    select 1 from public.espaco_configuracao e where e.familia_id=negocio_servicos.familia_id and e.modo='negocio'));
revoke all on public.negocio_servicos from anon,authenticated;
grant select on public.negocio_servicos to authenticated;

create function public.salvar_servico_negocio(p_familia uuid,p_nome text,p_materiais numeric,p_minutos integer,
  p_custo_hora numeric,p_custo_fixo numeric,p_taxas numeric,p_margem numeric,p_id uuid default null)
returns uuid language plpgsql security definer
set search_path=pg_catalog,public,private,pg_temp as $$
declare v_id uuid; v_count integer;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
    or not private.pode_editar(p_familia) or not public.is_internal_tester() then
    raise exception 'Sem permissão para editar serviços' using errcode='42501';
  end if;
  perform 1 from public.familias where id=p_familia for update;
  if not exists(select 1 from public.espaco_configuracao where familia_id=p_familia and modo='negocio') then
    raise exception 'Use um espaço dedicado ao negócio' using errcode='22023';
  end if;
  if p_nome is null or length(btrim(p_nome)) not between 1 and 120 or p_minutos is null or p_minutos not between 0 and 1440
    or exists(select 1 from unnest(array[p_materiais,p_custo_hora,p_custo_fixo,p_taxas,p_margem]) x
      where x is null or x::text in ('NaN','Infinity','-Infinity') or x<0 or x>1000000 or x<>round(x,2))
    or p_taxas+p_margem>=100 then
    raise exception 'Confira nome, duração, custos e percentuais' using errcode='22023';
  end if;
  if p_id is null then
    select count(*) into v_count from public.negocio_servicos where familia_id=p_familia and ativo;
    if v_count>=200 then raise exception 'Limite de 200 serviços ativos. Arquive os que não usa.' using errcode='22023'; end if;
    insert into public.negocio_servicos(familia_id,nome,materiais,minutos,custo_hora,custo_fixo,taxas,margem)
      values(p_familia,btrim(p_nome),p_materiais,p_minutos,p_custo_hora,p_custo_fixo,p_taxas,p_margem) returning id into v_id;
  else
    update public.negocio_servicos set nome=btrim(p_nome),materiais=p_materiais,minutos=p_minutos,
      custo_hora=p_custo_hora,custo_fixo=p_custo_fixo,taxas=p_taxas,margem=p_margem,atualizado_em=now()
      where id=p_id and familia_id=p_familia and ativo returning id into v_id;
    if v_id is null then raise exception 'Serviço indisponível neste espaço' using errcode='42501'; end if;
  end if;
  return v_id;
exception when unique_violation then raise exception 'Já existe um serviço ativo com este nome' using errcode='22023';
end;
$$;
revoke all on function public.salvar_servico_negocio(uuid,text,numeric,integer,numeric,numeric,numeric,numeric,uuid) from public,anon;
grant execute on function public.salvar_servico_negocio(uuid,text,numeric,integer,numeric,numeric,numeric,numeric,uuid) to authenticated;

create function public.arquivar_servico_negocio(p_familia uuid,p_id uuid)
returns boolean language plpgsql security definer
set search_path=pg_catalog,public,private,pg_temp as $$
declare v_id uuid;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
    or not private.pode_editar(p_familia) or not public.is_internal_tester() then
    raise exception 'Sem permissão para editar serviços' using errcode='42501';
  end if;
  perform 1 from public.familias where id=p_familia for update;
  if not exists(select 1 from public.espaco_configuracao where familia_id=p_familia and modo='negocio') then
    raise exception 'Use um espaço dedicado ao negócio' using errcode='22023';
  end if;
  update public.negocio_servicos set ativo=false,atualizado_em=now()
    where id=p_id and familia_id=p_familia and ativo returning id into v_id;
  return v_id is not null;
end;
$$;
revoke all on function public.arquivar_servico_negocio(uuid,uuid) from public,anon;
grant execute on function public.arquivar_servico_negocio(uuid,uuid) to authenticated;

create function private.preservar_contexto_servicos() returns trigger language plpgsql security definer
set search_path=pg_catalog,public,private,pg_temp as $$
begin
  if old.modo='negocio' and new.modo<>'negocio' and exists(select 1 from public.negocio_servicos where familia_id=old.familia_id) then
    raise exception 'Este espaço já tem serviços. Mantenha o negócio separado dos dados pessoais.' using errcode='22023';
  end if;
  return new;
end;
$$;
revoke all on function private.preservar_contexto_servicos() from public,anon,authenticated;
create trigger preservar_servicos_no_negocio before update on public.espaco_configuracao
for each row execute function private.preservar_contexto_servicos();
