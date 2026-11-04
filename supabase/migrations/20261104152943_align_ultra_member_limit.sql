CREATE OR REPLACE FUNCTION public.limitar_membros_por_plano()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  limite integer;
  total integer;
BEGIN
  SELECT CASE plano
    WHEN 'pro' THEN 2
    WHEN 'max' THEN 6
    WHEN 'ultra' THEN NULL
    ELSE 2
  END
  INTO limite
  FROM public.familias
  WHERE id = NEW.familia_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'família não encontrada';
  END IF;

  IF limite IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*)::integer
    INTO total
    FROM public.membros
   WHERE familia_id = NEW.familia_id;

  IF total >= limite THEN
    RAISE EXCEPTION 'limite do plano atingido: % pessoas no total', limite;
  END IF;

  RETURN NEW;
END;
$function$;
