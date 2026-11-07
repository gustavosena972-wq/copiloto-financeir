-- Aprendizado adaptativo do Copiloto.
-- Armazena apenas sinais estruturados e feedback; não guarda o texto bruto das conversas.

create table if not exists public.ia_memorias (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  chave text not null check (chave in (
    'foco_principal',
    'tema_recorrente',
    'preferencia_resposta',
    'area_favorita',
    'nivel_detalhe',
    'ultima_intencao'
  )),
  valor jsonb not null,
  confianca numeric(4,3) not null default 0.5 check (confianca >= 0 and confianca <= 1),
  evidencia integer not null default 1 check (evidencia >= 1 and evidencia <= 1000),
  origem text not null default 'interacao' check (origem in ('onboarding','interacao','feedback','preferencia')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (familia_id, usuario_id, chave)
);

create index if not exists ia_memorias_usuario_idx
  on public.ia_memorias (usuario_id, familia_id);

alter table public.ia_memorias enable row level security;
revoke all on public.ia_memorias from anon;
grant select, insert, update, delete on public.ia_memorias to authenticated;

drop policy if exists ia_memorias_owner_select on public.ia_memorias;
create policy ia_memorias_owner_select
  on public.ia_memorias
  for select
  to authenticated
  using (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.membros m
      where m.familia_id = ia_memorias.familia_id
        and m.usuario_id = (select auth.uid())
    )
  );

drop policy if exists ia_memorias_owner_insert on public.ia_memorias;
create policy ia_memorias_owner_insert
  on public.ia_memorias
  for insert
  to authenticated
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.membros m
      where m.familia_id = ia_memorias.familia_id
        and m.usuario_id = (select auth.uid())
    )
  );

drop policy if exists ia_memorias_owner_update on public.ia_memorias;
create policy ia_memorias_owner_update
  on public.ia_memorias
  for update
  to authenticated
  using (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.membros m
      where m.familia_id = ia_memorias.familia_id
        and m.usuario_id = (select auth.uid())
    )
  )
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.membros m
      where m.familia_id = ia_memorias.familia_id
        and m.usuario_id = (select auth.uid())
    )
  );

drop policy if exists ia_memorias_owner_delete on public.ia_memorias;
create policy ia_memorias_owner_delete
  on public.ia_memorias
  for delete
  to authenticated
  using (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.membros m
      where m.familia_id = ia_memorias.familia_id
        and m.usuario_id = (select auth.uid())
    )
  );

create table if not exists public.ia_feedback (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  conversa_id uuid references public.conversas_ia(id) on delete set null,
  mensagem_id uuid references public.mensagens_ia(id) on delete set null,
  avaliacao smallint not null check (avaliacao in (-1, 1)),
  motivo text check (motivo is null or char_length(motivo) <= 120),
  criado_em timestamptz not null default now()
);

create index if not exists ia_feedback_usuario_idx
  on public.ia_feedback (usuario_id, familia_id, criado_em desc);

alter table public.ia_feedback enable row level security;
revoke all on public.ia_feedback from anon;
grant select, insert, delete on public.ia_feedback to authenticated;

drop policy if exists ia_feedback_owner_select on public.ia_feedback;
create policy ia_feedback_owner_select
  on public.ia_feedback
  for select
  to authenticated
  using (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.membros m
      where m.familia_id = ia_feedback.familia_id
        and m.usuario_id = (select auth.uid())
    )
  );

drop policy if exists ia_feedback_owner_insert on public.ia_feedback;
create policy ia_feedback_owner_insert
  on public.ia_feedback
  for insert
  to authenticated
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.membros m
      where m.familia_id = ia_feedback.familia_id
        and m.usuario_id = (select auth.uid())
    )
  );

drop policy if exists ia_feedback_owner_delete on public.ia_feedback;
create policy ia_feedback_owner_delete
  on public.ia_feedback
  for delete
  to authenticated
  using (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.membros m
      where m.familia_id = ia_feedback.familia_id
        and m.usuario_id = (select auth.uid())
    )
  );