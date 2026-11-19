-- Keep historical member IDs for shared expenses and settlements.
alter table public.membros add column saiu_em timestamptz;
alter table public.membros add constraint membros_saida_sem_acesso
  check (saiu_em is null or (usuario_id is null and papel <> 'dono'));

-- Link real accounts only through server functions, never a client-side UPDATE.
revoke update on public.membros from public, anon, authenticated;
revoke update (usuario_id, familia_id, id, criado_em, saiu_em) on public.membros from public, anon, authenticated;
grant update (nome, papel, renda_mensal) on public.membros to authenticated;
-- Clients can still add an unlinked household member, under the existing insert policy.
revoke insert on public.membros from public, anon, authenticated;
revoke insert (saiu_em) on public.membros from public, anon, authenticated;
grant insert (familia_id, nome, papel, renda_mensal) on public.membros to authenticated;

CREATE OR REPLACE FUNCTION public.trg_membros_protege()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private', 'pg_temp'
AS $function$
begin
  if tg_op = 'UPDATE'
     and (new.papel is distinct from old.papel or new.usuario_id is distinct from old.usuario_id)
     and not private.eh_dono_base(old.familia_id)
     and not (
       old.usuario_id is not null and old.usuario_id = auth.uid()
       and old.papel <> 'dono' and new.usuario_id is null
       and old.saiu_em is null and new.saiu_em is not null
       and (to_jsonb(new) - array['usuario_id','saiu_em']) =
           (to_jsonb(old) - array['usuario_id','saiu_em'])
     ) then
    raise exception 'apenas o dono altera papéis';
  end if;
  if tg_op = 'DELETE' and old.papel = 'dono'
     and exists (select 1 from familias where id = old.familia_id)
     and (select count(*) from membros where familia_id = old.familia_id and papel = 'dono') <= 1 then
    raise exception 'a família precisa de ao menos um dono';
  end if;
  return coalesce(new, old);
end $function$;

CREATE OR REPLACE FUNCTION public.limitar_membros_por_plano()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private', 'pg_temp'
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
   WHERE familia_id = NEW.familia_id AND saiu_em IS NULL;

  IF total >= limite THEN
    RAISE EXCEPTION 'limite do plano atingido: % pessoas no total', limite;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.criar_convite(p_familia uuid, p_papel text DEFAULT 'editor'::text, p_email text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private', 'pg_temp'
AS $function$
DECLARE
  cod text := upper(substr(replace(gen_random_uuid()::text,'-',''),1,24));
  email_limpo text := nullif(lower(trim(p_email)), '');
  parte_local text;
  parte_dominio text;
  plano_familia text;
  acesso_familia timestamptz;
  limite_membros integer;
  ocupadas integer;
  modo_teste boolean := private.modo_teste_gratuito();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'não autenticado'; END IF;

  SELECT plano, acesso_ate INTO plano_familia, acesso_familia
    FROM public.familias WHERE id = p_familia FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'família não encontrada'; END IF;
  IF NOT modo_teste AND (acesso_familia IS NULL OR acesso_familia <= now()) THEN
    RAISE EXCEPTION 'a assinatura da família precisa estar ativa para gerar convites';
  END IF;
  IF NOT private.pode_editar(p_familia) THEN RAISE EXCEPTION 'sem permissão'; END IF;

  IF p_papel IS NULL OR p_papel NOT IN ('editor','leitor') THEN
    RAISE EXCEPTION 'papel inválido; use editor ou leitor';
  END IF;

  limite_membros := CASE
    WHEN modo_teste THEN NULL
    WHEN plano_familia = 'pro' THEN 2
    WHEN plano_familia = 'max' THEN 6
    ELSE NULL
  END;

  IF limite_membros IS NOT NULL THEN
    SELECT
      (SELECT count(*)::integer FROM public.membros WHERE familia_id = p_familia AND saiu_em IS NULL)
      +
      (SELECT count(*)::integer FROM public.convites
        WHERE familia_id = p_familia AND usado_por IS NULL AND expira_em > now())
      INTO ocupadas;
    IF ocupadas >= limite_membros THEN
      RAISE EXCEPTION 'limite de pessoas ou convites do plano atingido';
    END IF;
  END IF;

  IF email_limpo IS NOT NULL THEN
    parte_local := split_part(email_limpo, '@', 1);
    parte_dominio := split_part(email_limpo, '@', 2);
    IF char_length(email_limpo) > 254 OR position('@' in email_limpo) = 0
       OR parte_local = '' OR parte_dominio = '' OR position('.' in parte_dominio) < 2
       OR email_limpo LIKE '% %' OR email_limpo LIKE '%@%@%' THEN
      RAISE EXCEPTION 'e-mail inválido';
    END IF;
  END IF;

  INSERT INTO public.convites (familia_id, codigo, papel, email, criado_por)
  VALUES (p_familia, cod, p_papel, email_limpo, auth.uid());
  RETURN cod;
END
$function$;

CREATE OR REPLACE FUNCTION private.aceitar_convite(p_codigo text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private', 'pg_temp'
AS $function$
DECLARE
  c public.convites;
  email_usuario text := lower(trim(coalesce(auth.jwt() ->> 'email','')));
  inseridos integer := 0;
  codigo_limpo text := upper(trim(coalesce(p_codigo,'')));
  plano_familia text;
  acesso_familia timestamptz;
  limite_membros integer;
  total_membros integer;
  modo_teste boolean := private.modo_teste_gratuito();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;
  IF codigo_limpo !~ '^([A-F0-9]{8}|[A-F0-9]{24})$' THEN
    RAISE EXCEPTION 'código de convite inválido';
  END IF;

  SELECT * INTO c FROM public.convites
   WHERE codigo = codigo_limpo AND usado_por IS NULL AND expira_em > now()
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'convite inválido, expirado ou já utilizado';
  END IF;
  IF c.papel NOT IN ('editor','leitor') THEN
    RAISE EXCEPTION 'papel do convite inválido; solicite um novo convite';
  END IF;
  IF c.email IS NOT NULL AND lower(trim(c.email)) <> email_usuario THEN
    RAISE EXCEPTION 'este convite foi enviado para outro e-mail';
  END IF;

  IF EXISTS (SELECT 1 FROM public.membros WHERE usuario_id = auth.uid() AND familia_id <> c.familia_id) THEN
    RAISE EXCEPTION 'cada conta pode pertencer a uma única família; este usuário já está vinculado a outra família';
  END IF;

  IF EXISTS (SELECT 1 FROM public.membros WHERE familia_id = c.familia_id AND usuario_id = auth.uid()) THEN
    UPDATE public.convites SET usado_por = auth.uid() WHERE id = c.id;
    RETURN c.familia_id;
  END IF;

  SELECT plano, acesso_ate INTO plano_familia, acesso_familia
    FROM public.familias WHERE id = c.familia_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'família não encontrada'; END IF;
  IF NOT modo_teste AND (acesso_familia IS NULL OR acesso_familia <= now()) THEN
    RAISE EXCEPTION 'a assinatura desta família não está ativa; peça ao responsável para regularizar o acesso';
  END IF;

  limite_membros := CASE
    WHEN modo_teste THEN NULL
    WHEN plano_familia = 'pro' THEN 2
    WHEN plano_familia = 'max' THEN 6
    ELSE NULL
  END;

  IF limite_membros IS NOT NULL THEN
    SELECT count(*)::integer INTO total_membros FROM public.membros WHERE familia_id = c.familia_id AND saiu_em IS NULL;
    IF total_membros >= limite_membros THEN
      RAISE EXCEPTION 'limite de pessoas do plano atingido; peça ao responsável para ajustar o plano';
    END IF;
  END IF;

  INSERT INTO public.membros (familia_id, usuario_id, nome, papel)
  SELECT c.familia_id, auth.uid(), coalesce(nullif(trim(nome),''),'Membro'), c.papel
    FROM public.perfis WHERE id = auth.uid();

  GET DIAGNOSTICS inseridos = ROW_COUNT;
  IF inseridos <> 1 THEN
    RAISE EXCEPTION 'perfil do usuário não encontrado; entre novamente e tente outra vez';
  END IF;

  UPDATE public.convites SET usado_por = auth.uid() WHERE id = c.id;
  RETURN c.familia_id;
END
$function$;

create function public.sair_minha_familia(p_familia uuid, p_sucessor uuid default null)
returns void language plpgsql security definer
set search_path = pg_catalog, public, private, pg_temp
as $function$
declare
  uid uuid := auth.uid();
  atual public.membros%rowtype;
  sucessor public.membros%rowtype;
begin
  if uid is null then raise exception 'Sessão obrigatória.' using errcode='42501'; end if;

  if not exists (select 1 from public.membros where usuario_id=uid and familia_id=p_familia) then
    raise exception 'Você não participa desta família.' using errcode='42501';
  end if;
  perform 1 from public.familias where id=p_familia for update;
  select * into atual from public.membros where usuario_id=uid and familia_id=p_familia for update;
  if not found then raise exception 'Você não participa desta família.' using errcode='42501'; end if;

  if atual.papel='dono' then
    select * into sucessor from public.membros
      where id=p_sucessor and familia_id=p_familia and usuario_id is not null and usuario_id<>uid
      for update;
    if not found then
      raise exception 'Escolha outra pessoa desta família com acesso para assumir a responsabilidade.';
    end if;
    update public.membros set papel='dono' where id=sucessor.id;
    update public.familias set criado_por=sucessor.usuario_id where id=p_familia and criado_por=uid;
    update public.membros set papel='editor', usuario_id=null, saiu_em=now() where id=atual.id;
  else
    if p_sucessor is not null then raise exception 'Somente o responsável indica quem assume.' using errcode='42501'; end if;
    update public.membros set usuario_id=null, saiu_em=now() where id=atual.id;
  end if;
end
$function$;
revoke all on function public.sair_minha_familia(uuid, uuid) from public, anon;
grant execute on function public.sair_minha_familia(uuid, uuid) to authenticated;


-- Shared record references must survive a member leaving.
create policy membros_preservar_historico
  on public.membros as restrictive for delete to authenticated
  using (saiu_em is null);
