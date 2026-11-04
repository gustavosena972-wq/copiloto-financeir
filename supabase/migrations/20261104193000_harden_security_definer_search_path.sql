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


-- Keep account cleanup confined to trusted application tables. The old loop
-- accepted every FK to public.perfis and interpolated regclass text as SQL.
CREATE OR REPLACE FUNCTION private.excluir_minha_conta()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private, pg_temp
AS $function$
DECLARE
  uid uuid := auth.uid();
  r record;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.membros d
    JOIN public.membros o ON o.familia_id = d.familia_id
    WHERE d.usuario_id = uid
      AND d.papel = 'dono'
      AND o.usuario_id IS NOT NULL
      AND o.usuario_id <> uid
  ) THEN
    RAISE EXCEPTION 'Você é dono de uma família que tem outras pessoas com login. Remova-as ou peça para uma delas assumir antes de excluir a conta.';
  END IF;

  DELETE FROM public.familias
  WHERE id IN (
    SELECT familia_id
    FROM public.membros
    WHERE usuario_id = uid AND papel = 'dono'
  );
  DELETE FROM public.membros WHERE usuario_id = uid;

  FOR r IN
    SELECT
      n.nspname AS schema_name,
      t.relname AS table_name,
      a.attname AS column_name
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_catalog.pg_attribute a
      ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.perfis'::regclass
      AND c.confdeltype = 'a'
      AND NOT a.attnotnull
      AND n.nspname = 'public'
  LOOP
    EXECUTE pg_catalog.format(
      'UPDATE %I.%I SET %I = NULL WHERE %I = $1',
      r.schema_name,
      r.table_name,
      r.column_name,
      r.column_name
    ) USING uid;
  END LOOP;

  DELETE FROM auth.users WHERE id = uid;
END;
$function$;
