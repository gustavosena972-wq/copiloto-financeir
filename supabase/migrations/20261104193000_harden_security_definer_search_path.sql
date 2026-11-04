-- Harden every existing SECURITY DEFINER function against temporary-object shadowing.
-- pg_temp must be explicitly last: PostgreSQL otherwise searches temporary relations
-- before ordinary schemas, even when pg_temp is omitted from search_path.
DO $migration$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef
      AND p.prokind = 'f'
      AND n.nspname IN ('public', 'private')
  LOOP
    EXECUTE pg_catalog.format(
      'ALTER FUNCTION %I.%I(%s) SET search_path TO pg_catalog, public, private, pg_temp',
      fn.schema_name,
      fn.function_name,
      fn.identity_arguments
    );
  END LOOP;
END
$migration$;
