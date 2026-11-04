-- Execute in the Supabase SQL Editor after applying the hardening migration.
-- The transaction is rolled back; no persistent test data is created.
-- The fake identity is deliberately not an administrator. A temporary table with
-- the same name as public.admins must never turn this authenticated session into admin.
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);

CREATE TEMP TABLE admins (user_id uuid);
INSERT INTO pg_temp.admins (user_id)
VALUES ('11111111-1111-4111-8111-111111111111');

DO $test$
BEGIN
  IF has_table_privilege('anon', 'public.config_app', 'SELECT')
     OR has_column_privilege('anon', 'public.config_app', 'chave', 'SELECT')
     OR has_table_privilege('authenticated', 'public.config_app', 'SELECT')
     OR NOT has_column_privilege('authenticated', 'public.config_app', 'chave', 'SELECT') THEN
    RAISE EXCEPTION 'SECURITY REGRESSION: config_app client privileges are not restricted as expected';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'config_app'
      AND policyname = 'config_ler_authenticated_allowlist'
      AND 'authenticated' = ANY(roles)
      AND qual LIKE '%chave = ANY%'
  ) THEN
    RAISE EXCEPTION 'SECURITY REGRESSION: config_app allowlist policy is missing';
  END IF;

  IF public.eh_admin() IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'SECURITY REGRESSION: a temporary admins table changed the admin authorization result';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef
      AND p.prokind = 'f'
      AND n.nspname IN ('public', 'private')
      AND NOT EXISTS (
        SELECT 1
        FROM pg_catalog.unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS settings(config)
        WHERE config LIKE 'search_path=%pg_temp%'
      )
  ) THEN
    RAISE EXCEPTION 'SECURITY REGRESSION: a SECURITY DEFINER function lacks explicit pg_temp-last search_path';
  END IF;
END
$test$;

ROLLBACK;
