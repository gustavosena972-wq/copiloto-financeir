CREATE OR REPLACE FUNCTION private.validar_familia_unica_por_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.usuario_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('membro_familia:' || NEW.usuario_id::text)
  );

  IF EXISTS (
    SELECT 1
      FROM public.membros m
     WHERE m.usuario_id = NEW.usuario_id
       AND m.familia_id <> NEW.familia_id
       AND m.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'cada conta pode pertencer a uma única família';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.validar_familia_unica_por_usuario() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validar_familia_unica_por_usuario ON public.membros;
CREATE TRIGGER trg_validar_familia_unica_por_usuario
BEFORE INSERT OR UPDATE OF usuario_id, familia_id
ON public.membros
FOR EACH ROW
EXECUTE FUNCTION private.validar_familia_unica_por_usuario();
