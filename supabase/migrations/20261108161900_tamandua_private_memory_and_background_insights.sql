-- Personal conversations and memory never cross users or families.
-- Additive preferences; background processing remains opt-in.
create table public.tamandua_preferencias (
  usuario_id uuid primary key references public.perfis(id) on delete cascade,
  familia_id uuid not null references public.familias(id) on delete cascade,
  memoria_habilitada boolean not null default true,
  acompanhamento_habilitado boolean not null default false,
  idioma text not null default 'auto' check (char_length(idioma) between 2 and 16),
  atualizado_em timestamptz not null default now()
);
alter table public.tamandua_preferencias enable row level security;
revoke all on public.tamandua_preferencias from anon;
grant select,insert,update,delete on public.tamandua_preferencias to authenticated;
create policy tamandua_preferences_owner on public.tamandua_preferencias
for all to authenticated
using (usuario_id=(select auth.uid()) and private.eh_membro(familia_id))
with check (usuario_id=(select auth.uid()) and private.eh_membro(familia_id));

drop policy if exists conversas_ia_ler on public.conversas_ia;
drop policy if exists conversas_ia_inserir on public.conversas_ia;
drop policy if exists conversas_ia_editar on public.conversas_ia;
drop policy if exists conversas_ia_apagar on public.conversas_ia;
create policy conversations_owner on public.conversas_ia for all to authenticated
using (usuario_id=(select auth.uid()) and private.eh_membro(familia_id))
with check (usuario_id=(select auth.uid()) and private.eh_membro(familia_id));

drop policy if exists mensagens_ia_ler on public.mensagens_ia;
drop policy if exists mensagens_ia_inserir on public.mensagens_ia;
drop policy if exists mensagens_ia_editar on public.mensagens_ia;
drop policy if exists mensagens_ia_apagar on public.mensagens_ia;
create policy messages_conversation_owner on public.mensagens_ia for all to authenticated
using (exists (
 select 1 from public.conversas_ia c where c.id=conversa_id
 and c.familia_id=mensagens_ia.familia_id and c.usuario_id=(select auth.uid())
 and private.eh_membro(c.familia_id)
))
with check (exists (
 select 1 from public.conversas_ia c where c.id=conversa_id
 and c.familia_id=mensagens_ia.familia_id and c.usuario_id=(select auth.uid())
 and private.eh_membro(c.familia_id)
));
grant delete on public.ia_aprendizados to authenticated;
create policy ia_aprendizados_self_delete on public.ia_aprendizados for delete to authenticated
using (usuario_id=(select auth.uid()) and private.eh_membro(familia_id));

-- Only the session's family is resolved; no caller-supplied family ID exists.
create or replace function public.tamandua_contexto_financeiro(p_mes integer, p_ano integer)
returns jsonb language plpgsql stable security invoker set search_path=''
as $$
declare
 v_user uuid := (select auth.uid());
 v_family uuid;
 v_month uuid;
 v_plan text;
 v_totals jsonb;
 v_categories jsonb;
 v_due jsonb;
 v_goals jsonb;
 v_debt numeric;
 v_assets numeric;
 v_budget numeric;
 v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
 if v_user is null then raise exception 'Sessão obrigatória' using errcode='42501'; end if;
 if p_mes not between 1 and 12 or p_ano not between 2000 and 2100
    or p_mes is null or p_ano is null then raise exception 'Período inválido'; end if;
 select m.familia_id,f.plano into v_family,v_plan
 from public.membros m join public.familias f on f.id=m.familia_id
 where m.usuario_id=v_user limit 1;
 if v_family is null then raise exception 'Família não autorizada' using errcode='42501'; end if;
 select m.id into v_month from public.meses m join public.anos a on a.id=m.ano_id
 where m.familia_id=v_family and a.familia_id=v_family and m.mes=p_mes and a.ano=p_ano;
 select jsonb_build_object(
   'receitas',coalesce(sum(valor) filter(where tipo='receita'),0),
   'despesas',coalesce(sum(valor) filter(where tipo='despesa'),0),
   'recebido',coalesce(sum(valor) filter(where tipo='receita' and status='pago'),0),
   'pago',coalesce(sum(valor) filter(where tipo='despesa' and status='pago'),0),
   'a_receber',coalesce(sum(valor) filter(where tipo='receita' and status<>'pago'),0),
   'a_pagar',coalesce(sum(valor) filter(where tipo='despesa' and status<>'pago'),0),
   'quantidade',count(*)
 ) into v_totals from public.lancamentos
 where familia_id=v_family and mes_id=v_month and tipo<>'transferencia';
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into v_categories from (
   select coalesce(c.nome,'Sem categoria') as categoria,sum(l.valor) as valor
   from public.lancamentos l left join public.categorias c
   on c.id=l.categoria_id and c.familia_id=v_family
   where l.familia_id=v_family and l.mes_id=v_month and l.tipo='despesa'
   group by c.nome order by sum(l.valor) desc limit 12
 ) x;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into v_due from (
   select l.id,l.tipo,l.valor,l.data_vencimento,l.status
   from public.lancamentos l where l.familia_id=v_family and l.status<>'pago'
   and l.tipo<>'transferencia' and l.data_vencimento between v_today-30 and v_today+30
   order by l.data_vencimento,l.id limit 100
 ) x;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into v_goals from (
   select nome,valor_alvo,valor_atual,prazo
   from public.metas where familia_id=v_family order by prazo nulls last,id limit 12
 ) x;
 select coalesce(sum(saldo_devedor),0) into v_debt from public.dividas
 where familia_id=v_family and ativa;
 select coalesce(sum(case when tipo='ativo' then valor else -valor end),0)
 into v_assets from public.patrimonio_itens where familia_id=v_family;
 select coalesce(sum(valor_planejado),0) into v_budget from public.orcamentos
 where familia_id=v_family and mes_id=v_month;
 return jsonb_build_object(
   'fonte','banco_autorizado','mes',p_mes,'ano',p_ano,'plano',v_plan,
   'periodo_existente',v_month is not null,'totais',v_totals,
   'categorias',v_categories,'vencimentos_30_dias',v_due,
   'metas',v_goals,'dividas_ativas',v_debt,'patrimonio_liquido',v_assets,
   'orcamento',v_budget,'data_referencia',v_today,
   'limites','Sem saldo bancário inicial; totais do período cadastrado; vencimentos limitados a 100 e metas a 12.'
 );
end;
$$;
revoke all on function public.tamandua_contexto_financeiro(integer,integer) from public,anon;
grant execute on function public.tamandua_contexto_financeiro(integer,integer) to authenticated;

-- Saving conversation and its two messages is atomic and uses the caller's RLS.
create or replace function public.tamandua_salvar_conversa(p_conversa uuid,p_mensagem text,p_resposta text)
returns uuid language plpgsql security invoker set search_path=''
as $$
declare
 v_user uuid := (select auth.uid());
 v_family uuid;
 v_id uuid;
begin
 if v_user is null then raise exception 'Sessão obrigatória' using errcode='42501'; end if;
 if p_mensagem is null or char_length(p_mensagem) not between 1 and 2000
 or p_resposta is null or char_length(p_resposta) not between 1 and 5000 then
  raise exception 'Mensagem inválida';
 end if;
 select familia_id into v_family from public.membros where usuario_id=v_user limit 1;
 if v_family is null then raise exception 'Família não autorizada' using errcode='42501'; end if;
 if p_conversa is not null then
  select id into v_id from public.conversas_ia
  where id=p_conversa and familia_id=v_family and usuario_id=v_user;
  if v_id is null then raise exception 'Conversa não autorizada' using errcode='42501'; end if;
 else
  insert into public.conversas_ia(familia_id,usuario_id,titulo)
  values(v_family,v_user,left(p_mensagem,80)) returning id into v_id;
 end if;
 insert into public.mensagens_ia(familia_id,conversa_id,papel,conteudo)
 values(v_family,v_id,'usuario',p_mensagem),(v_family,v_id,'assistente',p_resposta);
 return v_id;
end;
$$;
revoke all on function public.tamandua_salvar_conversa(uuid,text,text) from public,anon;
grant execute on function public.tamandua_salvar_conversa(uuid,text,text) to authenticated;
