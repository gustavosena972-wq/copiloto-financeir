-- Copiloto Financeiro — hardening de RLS e índices da camada de inteligência
-- Melhora o plano de execução das políticas RLS e acelera relações por família/conversa/mensagem.

create index if not exists ia_eventos_familia_idx
  on public.ia_eventos(familia_id, criado_em desc);

create index if not exists ia_feedback_conversa_idx
  on public.ia_feedback(conversa_id, criado_em desc);

create index if not exists ia_feedback_familia_idx
  on public.ia_feedback(familia_id, criado_em desc);

create index if not exists ia_feedback_mensagem_idx
  on public.ia_feedback(mensagem_id, criado_em desc);

drop policy if exists ia_aprendizados_self_read on public.ia_aprendizados;
create policy ia_aprendizados_self_read
  on public.ia_aprendizados
  for select
  to authenticated
  using (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.membros m
      where m.familia_id = ia_aprendizados.familia_id
        and m.usuario_id = (select auth.uid())
    )
  );

drop policy if exists ia_aprendizados_self_insert on public.ia_aprendizados;
create policy ia_aprendizados_self_insert
  on public.ia_aprendizados
  for insert
  to authenticated
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.membros m
      where m.familia_id = ia_aprendizados.familia_id
        and m.usuario_id = (select auth.uid())
    )
  );

drop policy if exists ia_aprendizados_self_update on public.ia_aprendizados;
create policy ia_aprendizados_self_update
  on public.ia_aprendizados
  for update
  to authenticated
  using (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.membros m
      where m.familia_id = ia_aprendizados.familia_id
        and m.usuario_id = (select auth.uid())
    )
  )
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.membros m
      where m.familia_id = ia_aprendizados.familia_id
        and m.usuario_id = (select auth.uid())
    )
  );

drop policy if exists ia_eventos_self_read on public.ia_eventos;
create policy ia_eventos_self_read
  on public.ia_eventos
  for select
  to authenticated
  using (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.membros m
      where m.familia_id = ia_eventos.familia_id
        and m.usuario_id = (select auth.uid())
    )
  );

drop policy if exists ia_eventos_self_insert on public.ia_eventos;
create policy ia_eventos_self_insert
  on public.ia_eventos
  for insert
  to authenticated
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.membros m
      where m.familia_id = ia_eventos.familia_id
        and m.usuario_id = (select auth.uid())
    )
  );

drop policy if exists ia_feedback_self_read on public.ia_feedback;
create policy ia_feedback_self_read
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

drop policy if exists ia_feedback_self_insert on public.ia_feedback;
create policy ia_feedback_self_insert
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
