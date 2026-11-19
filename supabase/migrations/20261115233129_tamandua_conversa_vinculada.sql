-- Bind a response to the membership that authorized its financial context.
create function public.tamandua_salvar_conversa_vinculada(
  p_vinculo uuid, p_familia uuid, p_conversa uuid, p_mensagem text, p_resposta text
) returns uuid language plpgsql security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
begin
  perform 1 from public.membros
    where id = p_vinculo and familia_id = p_familia and usuario_id = auth.uid()
    for share;
  if not found or not private.eh_membro(p_familia) then
    raise exception 'O vínculo com a família mudou.' using errcode = '42501';
  end if;
  return public.tamandua_salvar_conversa(p_conversa, p_mensagem, p_resposta);
end;
$$;
revoke all on function public.tamandua_salvar_conversa_vinculada(uuid,uuid,uuid,text,text) from public, anon;
grant execute on function public.tamandua_salvar_conversa_vinculada(uuid,uuid,uuid,text,text) to authenticated;
