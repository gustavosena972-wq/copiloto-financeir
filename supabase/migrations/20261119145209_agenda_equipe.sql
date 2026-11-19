create table public.negocio_equipe (
 id uuid primary key default gen_random_uuid(),
 familia_id uuid not null references public.familias(id) on delete cascade,
 nome text not null check(length(btrim(nome)) between 1 and 80),
 funcao text not null default '' check(length(funcao)<=80),
 unique(familia_id,id)
);
create table public.negocio_agenda (
 id uuid primary key default gen_random_uuid(),
 familia_id uuid not null references public.familias(id) on delete cascade,
 cliente text not null check(length(btrim(cliente)) between 1 and 100),
 atividade text not null default '' check(length(atividade)<=120),
 dia date not null, hora time not null,
 funcionario_id uuid,
 cancelado boolean not null default false,
 foreign key(familia_id,funcionario_id) references public.negocio_equipe(familia_id,id)
);
create index negocio_agenda_periodo on public.negocio_agenda(familia_id,dia,hora,id) where not cancelado;
create unique index negocio_agenda_horario on public.negocio_agenda(familia_id,funcionario_id,dia,hora)
 where funcionario_id is not null and not cancelado;
do $$
declare tab text; base text;
begin
 foreach tab in array array['negocio_equipe','negocio_agenda'] loop
  base:=format('public.is_internal_tester() and exists(select 1 from public.espaco_configuracao e where e.familia_id=%I.familia_id and e.modo=''negocio'')',tab);
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from public, anon, authenticated',tab);
  execute format('grant select,insert on public.%I to authenticated',tab);
  execute format('create policy leitura on public.%I for select to authenticated using (%s and private.eh_membro(familia_id))',tab,base);
  execute format('create policy cadastro on public.%I for insert to authenticated with check (%s and private.pode_editar(familia_id))',tab,base);
 end loop;
end $$;
grant update(cancelado) on public.negocio_agenda to authenticated;
create policy cancelar on public.negocio_agenda for update to authenticated
 using (public.is_internal_tester() and private.pode_editar(familia_id) and exists
 (select 1 from public.espaco_configuracao e where e.familia_id=negocio_agenda.familia_id and e.modo='negocio'))
 with check (cancelado and private.pode_editar(familia_id));
create function private.preservar_agenda_negocio() returns trigger language plpgsql security definer
set search_path=pg_catalog,public,pg_temp as $$
begin
 if old.modo='negocio' and new.modo<>'negocio' and
 (exists(select 1 from public.negocio_equipe where familia_id=old.familia_id) or
  exists(select 1 from public.negocio_agenda where familia_id=old.familia_id)) then
  raise exception 'Este espaço já tem equipe ou agendamentos.' using errcode='22023';
 end if;
 return new;
end $$;
revoke all on function private.preservar_agenda_negocio() from public,anon,authenticated;
create trigger preservar_agenda_negocio before update on public.espaco_configuracao
for each row execute function private.preservar_agenda_negocio();
