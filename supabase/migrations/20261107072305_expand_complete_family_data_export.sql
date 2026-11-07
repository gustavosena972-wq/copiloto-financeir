CREATE OR REPLACE FUNCTION private.exportar_tudo(p_familia uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'private', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT private.eh_membro(p_familia) THEN
    RAISE EXCEPTION 'sem permissão';
  END IF;

  RETURN jsonb_build_object(
    'exportado_em', now(),
    'familia', (SELECT to_jsonb(f) - 'acesso_ate' FROM public.familias f WHERE f.id = p_familia),
    'membros', (SELECT coalesce(jsonb_agg(to_jsonb(x) - 'usuario_id'), '[]'::jsonb) FROM public.membros x WHERE x.familia_id = p_familia),
    'anos', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.anos x WHERE x.familia_id = p_familia),
    'meses', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.meses x WHERE x.familia_id = p_familia),
    'categorias', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.categorias x WHERE x.familia_id = p_familia),
    'tags', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.tags x WHERE x.familia_id = p_familia),
    'contas_cartoes', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.contas_cartoes x WHERE x.familia_id = p_familia),
    'lancamentos', (SELECT coalesce(jsonb_agg(to_jsonb(x) - 'criado_por'), '[]'::jsonb) FROM public.lancamentos x WHERE x.familia_id = p_familia),
    'lancamento_tags', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.lancamento_tags x WHERE x.familia_id = p_familia),
    'lancamento_divisoes', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.lancamento_divisoes x WHERE x.familia_id = p_familia),
    'recorrencias', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.recorrencias x WHERE x.familia_id = p_familia),
    'regras_categorizacao', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.regras_categorizacao x WHERE x.familia_id = p_familia),
    'orcamentos', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.orcamentos x WHERE x.familia_id = p_familia),
    'metas', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.metas x WHERE x.familia_id = p_familia),
    'aportes_meta', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.aportes_meta x WHERE x.familia_id = p_familia),
    'dividas', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.dividas x WHERE x.familia_id = p_familia),
    'patrimonio_itens', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.patrimonio_itens x WHERE x.familia_id = p_familia),
    'patrimonio_snapshots', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.patrimonio_snapshots x WHERE x.familia_id = p_familia),
    'acertos', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.acertos x WHERE x.familia_id = p_familia),
    'sugestoes', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.sugestoes x WHERE x.familia_id = p_familia),
    'importacoes', (SELECT coalesce(jsonb_agg(to_jsonb(x) - 'criado_por'), '[]'::jsonb) FROM public.importacoes x WHERE x.familia_id = p_familia),
    'historico', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', h.id, 'tabela', h.tabela, 'registro_id', h.registro_id, 'acao', h.acao,
        'dados_antes', h.dados_antes - 'criado_por',
        'dados_depois', h.dados_depois - 'criado_por',
        'criado_em', h.criado_em
      )), '[]'::jsonb)
      FROM public.historico h WHERE h.familia_id = p_familia
    ),
    'notificacoes', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.notificacoes x WHERE x.familia_id = p_familia AND x.usuario_id = v_uid),
    'conversas_ia', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.conversas_ia x WHERE x.familia_id = p_familia AND (x.usuario_id IS NULL OR x.usuario_id = v_uid)),
    'mensagens_ia', (
      SELECT coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
      FROM public.mensagens_ia m JOIN public.conversas_ia c ON c.id = m.conversa_id
      WHERE m.familia_id = p_familia AND (c.usuario_id IS NULL OR c.usuario_id = v_uid)
    ),
    'planos', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.planos x WHERE x.familia_id = p_familia AND (x.usuario_id IS NULL OR x.usuario_id = v_uid)),
    'consentimentos', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM public.consentimentos x WHERE x.usuario_id = v_uid),
    'login', (SELECT coalesce(to_jsonb(x), '{}'::jsonb) FROM public.login_usuarios x WHERE x.user_id = v_uid),
    'pagamentos', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', x.id, 'valor', x.valor, 'status', x.status, 'plano', x.plano,
        'pagador_nome', x.pagador_nome, 'informado_em', x.informado_em,
        'decidido_em', x.decidido_em, 'dias_concedidos', x.dias_concedidos
      )), '[]'::jsonb)
      FROM public.pagamentos x WHERE x.familia_id = p_familia AND x.usuario_id = v_uid
    ),
    'compras_google_play', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', x.id, 'produto_id', x.produto_id, 'plano', x.plano, 'valor', x.valor,
        'pedido_google', x.pedido_google, 'comprado_em', x.comprado_em,
        'status', x.status, 'criado_em', x.criado_em, 'decidido_em', x.decidido_em
      )), '[]'::jsonb)
      FROM public.google_play_compras x WHERE x.familia_id = p_familia AND x.usuario_id = v_uid
    )
  );
END;
$function$;