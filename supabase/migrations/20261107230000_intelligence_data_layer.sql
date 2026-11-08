-- Copiloto Financeiro — camada de dados da inteligência adaptativa
-- Não armazena segredos financeiros nem substitui os dados financeiros do app.
-- Memória individual/familiar é isolada por RLS; conhecimento global é somente leitura para usuários.

create table if not exists public.ia_conhecimento (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text not null,
  conteudo text not null,
  fonte text,
  autor text,
  publicado_em timestamptz,
  revisado_em timestamptz default now(),
  versao integer not null default 1,
  confianca numeric(4,3) not null default 0.800 check (confianca between 0 and 1),
  tags text[] not null default '{}',
  status text not null default 'ativo' check (status in ('rascunho','ativo','arquivado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.ia_aprendizados (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  chave text not null,
  valor jsonb not null default '{}'::jsonb,
  confianca numeric(4,3) not null default 0.500 check (confianca between 0 and 1),
  evidencia integer not null default 1 check (evidencia >= 1),
  ultima_evidencia_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (familia_id, usuario_id, chave)
);

create table if not exists public.ia_eventos (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  tipo text not null,
  intencao text,
  contexto jsonb not null default '{}'::jsonb,
  resultado text,
  criado_em timestamptz not null default now()
);

create table if not exists public.ia_feedback (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  conversa_id uuid references public.conversas_ia(id) on delete set null,
  mensagem_id uuid references public.mensagens_ia(id) on delete set null,
  avaliacao smallint not null check (avaliacao in (-1,1)),
  motivo text check (motivo is null or char_length(motivo) <= 500),
  criado_em timestamptz not null default now()
);

create index if not exists ia_conhecimento_status_idx
  on public.ia_conhecimento(status, categoria, atualizado_em desc);

create index if not exists ia_conhecimento_tags_idx
  on public.ia_conhecimento using gin(tags);

create index if not exists ia_aprendizados_usuario_idx
  on public.ia_aprendizados(usuario_id, familia_id);

create index if not exists ia_eventos_usuario_idx
  on public.ia_eventos(usuario_id, familia_id, criado_em desc);

create index if not exists ia_feedback_usuario_idx
  on public.ia_feedback(usuario_id, familia_id, criado_em desc);

alter table public.ia_conhecimento enable row level security;
alter table public.ia_aprendizados enable row level security;
alter table public.ia_eventos enable row level security;
alter table public.ia_feedback enable row level security;

drop policy if exists ia_conhecimento_authenticated_read on public.ia_conhecimento;
create policy ia_conhecimento_authenticated_read
  on public.ia_conhecimento
  for select
  to authenticated
  using (status = 'ativo');

drop policy if exists ia_aprendizados_self_read on public.ia_aprendizados;
create policy ia_aprendizados_self_read
  on public.ia_aprendizados
  for select
  to authenticated
  using (usuario_id = auth.uid());

drop policy if exists ia_aprendizados_self_insert on public.ia_aprendizados;
create policy ia_aprendizados_self_insert
  on public.ia_aprendizados
  for insert
  to authenticated
  with check (
    usuario_id = auth.uid()
    and exists (
      select 1 from public.membros m
      where m.familia_id = ia_aprendizados.familia_id
        and m.usuario_id = auth.uid()
    )
  );

drop policy if exists ia_aprendizados_self_update on public.ia_aprendizados;
create policy ia_aprendizados_self_update
  on public.ia_aprendizados
  for update
  to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

drop policy if exists ia_eventos_self_read on public.ia_eventos;
create policy ia_eventos_self_read
  on public.ia_eventos
  for select
  to authenticated
  using (usuario_id = auth.uid());

drop policy if exists ia_eventos_self_insert on public.ia_eventos;
create policy ia_eventos_self_insert
  on public.ia_eventos
  for insert
  to authenticated
  with check (
    usuario_id = auth.uid()
    and exists (
      select 1 from public.membros m
      where m.familia_id = ia_eventos.familia_id
        and m.usuario_id = auth.uid()
    )
  );

drop policy if exists ia_feedback_self_read on public.ia_feedback;
create policy ia_feedback_self_read
  on public.ia_feedback
  for select
  to authenticated
  using (usuario_id = auth.uid());

drop policy if exists ia_feedback_self_insert on public.ia_feedback;
create policy ia_feedback_self_insert
  on public.ia_feedback
  for insert
  to authenticated
  with check (
    usuario_id = auth.uid()
    and exists (
      select 1 from public.membros m
      where m.familia_id = ia_feedback.familia_id
        and m.usuario_id = auth.uid()
    )
  );

revoke all on public.ia_conhecimento from anon;
revoke all on public.ia_aprendizados from anon;
revoke all on public.ia_eventos from anon;
revoke all on public.ia_feedback from anon;

grant select on public.ia_conhecimento to authenticated;
grant select, insert, update on public.ia_aprendizados to authenticated;
grant select, insert on public.ia_eventos to authenticated;
grant select, insert on public.ia_feedback to authenticated;

comment on table public.ia_conhecimento is 'Conhecimento global validado usado pela camada de inteligência do Copiloto.';
comment on table public.ia_aprendizados is 'Sinais adaptativos por usuário/família; não contém segredos financeiros.';
comment on table public.ia_eventos is 'Eventos estruturados de uso da inteligência para evolução e análise.';
comment on table public.ia_feedback is 'Feedback explícito do usuário sobre respostas da inteligência.';
