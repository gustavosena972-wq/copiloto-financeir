create role anon nologin; create role authenticated nologin;
create schema auth; create schema private;
grant usage on schema public,auth,private to authenticated,anon;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.perfis ("id" uuid primary key,
"nome" text default ''::text,
"moeda" text default 'BRL'::text,
"criado_em" timestamp with time zone default now(),
"instrucoes_ia" text);
create table public.familias ("id" uuid default gen_random_uuid() primary key,
"nome" text,
"criado_por" uuid,
"criado_em" timestamp with time zone default now(),
"meta_reducao_cartao" numeric default 10,
"acesso_ate" timestamp with time zone,
"plano" text default 'pro'::text);
create table public.membros ("id" uuid default gen_random_uuid() primary key,
"familia_id" uuid,
"usuario_id" uuid,
"nome" text,
"papel" text default 'editor'::text,
"renda_mensal" numeric,
"criado_em" timestamp with time zone default now());
create table public.anos ("id" uuid default gen_random_uuid() primary key,
"familia_id" uuid,
"ano" integer,
"status" text default 'aberto'::text,
"fechado_em" timestamp with time zone,
"poupanca_inicial" numeric default 0);
create table public.meses ("id" uuid default gen_random_uuid() primary key,
"ano_id" uuid,
"familia_id" uuid,
"mes" integer,
"status" text default 'aberto'::text,
"fechado_em" timestamp with time zone);
create table public.lancamentos ("id" uuid default gen_random_uuid() primary key,
"familia_id" uuid,
"mes_id" uuid,
"membro_id" uuid,
"categoria_id" uuid,
"conta_id" uuid,
"conta_destino_id" uuid,
"tipo" text default 'despesa'::text,
"descricao" text,
"valor" numeric,
"valor_previsto" numeric,
"data_vencimento" date,
"data_pagamento" date,
"status" text default 'pendente'::text,
"parcela_atual" integer,
"parcelas_total" integer,
"grupo_parcelas" uuid,
"recorrencia_id" uuid,
"recorrente" boolean default false,
"origem" text default 'manual'::text,
"importacao_id" uuid,
"anexo_path" text,
"observacao" text,
"criado_por" uuid,
"criado_em" timestamp with time zone default now(),
"atualizado_em" timestamp with time zone default now(),
"natureza_compromisso" text default 'compra'::text);
create table public.categorias ("id" uuid default gen_random_uuid() primary key,
"familia_id" uuid,
"parent_id" uuid,
"nome" text,
"tipo" text default 'despesa'::text,
"essencial" boolean default false,
"cor" text,
"icone" text,
"meta_mensal" numeric,
"modo_orcamento" text default 'flex'::text,
"atualizado_em" timestamp with time zone default now(),
"grupo" text default 'variaveis'::text);
create table public.metas ("id" uuid default gen_random_uuid() primary key,
"familia_id" uuid,
"nome" text,
"tipo" text default 'economia'::text,
"valor_alvo" numeric,
"valor_atual" numeric default 0,
"prazo" date,
"atualizado_em" timestamp with time zone default now());
create table public.dividas ("id" uuid default gen_random_uuid() primary key,
"familia_id" uuid,
"nome" text,
"credor" text,
"saldo_devedor" numeric,
"taxa_juros_mensal" numeric default 0,
"pagamento_minimo" numeric default 0,
"ativa" boolean default true,
"atualizado_em" timestamp with time zone default now());
create table public.patrimonio_itens ("id" uuid default gen_random_uuid() primary key,
"familia_id" uuid,
"tipo" text,
"nome" text,
"categoria" text,
"valor" numeric,
"atualizado_em" timestamp with time zone default now());
create table public.orcamentos ("id" uuid default gen_random_uuid() primary key,
"familia_id" uuid,
"mes_id" uuid,
"categoria_id" uuid,
"valor_planejado" numeric default 0,
"atualizado_em" timestamp with time zone default now());
create table public.conversas_ia ("id" uuid default gen_random_uuid() primary key,
"familia_id" uuid,
"usuario_id" uuid,
"titulo" text,
"criado_em" timestamp with time zone default now(),
"fixada" boolean default false);
create table public.mensagens_ia ("id" uuid default gen_random_uuid() primary key,
"familia_id" uuid,
"conversa_id" uuid,
"papel" text,
"conteudo" text,
"criado_em" timestamp with time zone default now());
create table public.ia_aprendizados ("id" uuid default gen_random_uuid() primary key,
"familia_id" uuid,
"usuario_id" uuid,
"chave" text,
"valor" jsonb default '{}'::jsonb,
"confianca" numeric default 0.500,
"evidencia" integer default 1,
"ultima_evidencia_em" timestamp with time zone default now(),
"criado_em" timestamp with time zone default now(),
"atualizado_em" timestamp with time zone default now());
create function private.eh_membro(p_family uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.membros where familia_id=p_family and usuario_id=(select auth.uid()))$$;
grant execute on function private.eh_membro(uuid) to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
alter table public.familias enable row level security;
create policy family_access on public.familias for all to authenticated using(private.eh_membro(id)) with check(private.eh_membro(id));
alter table public.membros enable row level security;
create policy member_access on public.membros for select to authenticated using(private.eh_membro(familia_id));
alter table public.anos enable row level security;
create policy family_access on public.anos for all to authenticated using(private.eh_membro(familia_id)) with check(private.eh_membro(familia_id));
alter table public.meses enable row level security;
create policy family_access on public.meses for all to authenticated using(private.eh_membro(familia_id)) with check(private.eh_membro(familia_id));
alter table public.lancamentos enable row level security;
create policy family_access on public.lancamentos for all to authenticated using(private.eh_membro(familia_id)) with check(private.eh_membro(familia_id));
alter table public.categorias enable row level security;
create policy family_access on public.categorias for all to authenticated using(private.eh_membro(familia_id)) with check(private.eh_membro(familia_id));
alter table public.metas enable row level security;
create policy family_access on public.metas for all to authenticated using(private.eh_membro(familia_id)) with check(private.eh_membro(familia_id));
alter table public.dividas enable row level security;
create policy family_access on public.dividas for all to authenticated using(private.eh_membro(familia_id)) with check(private.eh_membro(familia_id));
alter table public.patrimonio_itens enable row level security;
create policy family_access on public.patrimonio_itens for all to authenticated using(private.eh_membro(familia_id)) with check(private.eh_membro(familia_id));
alter table public.orcamentos enable row level security;
create policy family_access on public.orcamentos for all to authenticated using(private.eh_membro(familia_id)) with check(private.eh_membro(familia_id));
alter table public.conversas_ia enable row level security;
create policy conversas_ia_ler on public.conversas_ia for select to authenticated using(private.eh_membro(familia_id));
create policy conversas_ia_inserir on public.conversas_ia for insert to authenticated with check(private.eh_membro(familia_id));
create policy conversas_ia_editar on public.conversas_ia for update to authenticated using(private.eh_membro(familia_id)) with check(private.eh_membro(familia_id));
create policy conversas_ia_apagar on public.conversas_ia for delete to authenticated using(private.eh_membro(familia_id));
alter table public.mensagens_ia enable row level security;
create policy mensagens_ia_ler on public.mensagens_ia for select to authenticated using(private.eh_membro(familia_id));
create policy mensagens_ia_inserir on public.mensagens_ia for insert to authenticated with check(private.eh_membro(familia_id));
create policy mensagens_ia_editar on public.mensagens_ia for update to authenticated using(private.eh_membro(familia_id)) with check(private.eh_membro(familia_id));
create policy mensagens_ia_apagar on public.mensagens_ia for delete to authenticated using(private.eh_membro(familia_id));
alter table public.ia_aprendizados enable row level security;
create policy learning_owner on public.ia_aprendizados for select to authenticated using(usuario_id=(select auth.uid()) and private.eh_membro(familia_id));
create policy learning_insert on public.ia_aprendizados for insert to authenticated with check(usuario_id=(select auth.uid()) and private.eh_membro(familia_id));
