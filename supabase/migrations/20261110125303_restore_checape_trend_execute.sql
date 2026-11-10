-- public.gerar_checape is SECURITY INVOKER and calls this protected helper.
-- Keep the existing household/edit-access checks inside the helper unchanged.
-- Grant only its execution to authenticated; no table access or anonymous access.
grant execute on function private.gerar_alertas_tendencia(uuid) to authenticated;

