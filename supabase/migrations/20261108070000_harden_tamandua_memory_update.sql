-- Tamanduá: restringe atualização da memória à família da sessão autenticada.
-- A camada de memória permanece em ia_aprendizados; não cria uma segunda fonte de verdade.

drop policy if exists ia_aprendizados_self_update on public.ia_aprendizados;

create policy ia_aprendizados_self_update
  on public.ia_aprendizados
  for update
  to authenticated
  using (
    usuario_id = (select auth.uid())
    and exists (
      select 1
      from public.membros m
      where m.familia_id = ia_aprendizados.familia_id
        and m.usuario_id = (select auth.uid())
    )
  )
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1
      from public.membros m
      where m.familia_id = ia_aprendizados.familia_id
        and m.usuario_id = (select auth.uid())
    )
  );
