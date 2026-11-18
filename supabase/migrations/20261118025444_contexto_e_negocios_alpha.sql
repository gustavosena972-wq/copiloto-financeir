create table public.espaco_configuracao (
  familia_id uuid primary key references public.familias(id) on delete cascade,
  modo text not null check (modo in ('pessoal','familiar','negocio')),
  segmento text not null default '' check (length(segmento)<=80),
  atualizado_em timestamptz not null default now()
);
alter table public.espaco_configuracao enable row level security;
create policy configuracao_membro on public.espaco_configuracao
  for select to authenticated using (private.eh_membro(familia_id));
grant select on public.espaco_configuracao to authenticated;
revoke insert,update,delete on public.espaco_configuracao from anon,authenticated;

create function public.configurar_meu_espaco(p_modo text,p_segmento text default '')
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  v_familia uuid;
  v_modo text;
  v_segmento text := btrim(coalesce(p_segmento,''));
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
    raise exception 'Sessão obrigatória' using errcode='42501';
  end if;
  if p_modo is null or p_modo not in ('pessoal','familiar','negocio') or length(v_segmento)>80 then
    raise exception 'Configuração inválida' using errcode='22023';
  end if;
  select familia_id into v_familia from public.membros
    where usuario_id=auth.uid() and papel='dono';
  if v_familia is null then
    raise exception 'Somente o responsável configura o espaço' using errcode='42501';
  end if;
  perform 1 from public.familias where id=v_familia for update;
  select modo into v_modo from public.espaco_configuracao where familia_id=v_familia;
  v_modo:=coalesce(v_modo,'familiar');
  if p_modo='negocio' and not public.is_internal_tester() then
    raise exception 'Negócios está disponível no piloto Alpha' using errcode='42501';
  end if;
  if (v_modo='negocio')<>(p_modo='negocio') and (
    exists(select 1 from public.lancamentos where familia_id=v_familia)
    or exists(select 1 from public.metas where familia_id=v_familia)
    or exists(select 1 from public.dividas where familia_id=v_familia)
    or exists(select 1 from public.patrimonio_itens where familia_id=v_familia)
  ) then
    raise exception 'Este espaço já tem registros. Use um espaço vazio dedicado ao negócio para manter os dados separados.' using errcode='22023';
  end if;
  if p_modo='pessoal' and exists(
    select 1 from public.membros where familia_id=v_familia
      and usuario_id is not null and usuario_id<>auth.uid()
  ) then
    raise exception 'Este espaço é compartilhado. Confira as pessoas com acesso antes de escolher o uso individual.' using errcode='22023';
  end if;
  insert into public.espaco_configuracao(familia_id,modo,segmento)
    values(v_familia,p_modo,case when p_modo='negocio' then v_segmento else '' end)
    on conflict(familia_id) do update
    set modo=excluded.modo,segmento=excluded.segmento,atualizado_em=now();
  return jsonb_build_object('modo',p_modo,'segmento',case when p_modo='negocio' then v_segmento else '' end);
end;
$$;
revoke all on function public.configurar_meu_espaco(text,text) from public,anon;
grant execute on function public.configurar_meu_espaco(text,text) to authenticated;

