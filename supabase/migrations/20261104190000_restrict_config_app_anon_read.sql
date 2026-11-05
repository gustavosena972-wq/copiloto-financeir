-- Restrict client reads of business configuration.
-- The app needs a small, explicit set of values after authentication (Pix instructions
-- for the legacy web flow and operator contact details). Future keys must stay private
-- unless deliberately added to this allowlist.
BEGIN;

REVOKE SELECT ON TABLE public.config_app FROM anon, authenticated, PUBLIC;
REVOKE SELECT (chave, valor) ON TABLE public.config_app FROM anon, authenticated, PUBLIC;

GRANT SELECT (chave, valor) ON TABLE public.config_app TO authenticated;

DROP POLICY IF EXISTS config_ler ON public.config_app;
CREATE POLICY config_ler_authenticated_allowlist
  ON public.config_app
  FOR SELECT
  TO authenticated
  USING (
    chave = ANY (ARRAY[
      'pix_chave',
      'pix_dias',
      'pix_nome',
      'pix_cidade',
      'operador_nome',
      'operador_cnpj',
      'contato_email',
      'versao_termos'
    ]::text[])
  );

COMMIT;
