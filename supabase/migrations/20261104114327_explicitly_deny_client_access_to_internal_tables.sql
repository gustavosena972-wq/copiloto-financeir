-- These tables are accessed only by trusted Edge Functions using service_role.
-- Explicit deny policies document and enforce that browser roles must never access them.
CREATE POLICY deny_client_access_google_play_compras
  ON public.google_play_compras
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY deny_client_access_login_recuperacao
  ON public.login_recuperacao
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY deny_client_access_login_usuarios
  ON public.login_usuarios
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);
