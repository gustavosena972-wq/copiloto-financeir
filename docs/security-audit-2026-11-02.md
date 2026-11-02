# Auditoria de segurança — 02/11/2026

## Alterações aplicadas no Supabase

Migration aplicada: `harden_import_split_month_copy_admin_config`.

- `confirmar_importacao`: trava a importação durante a confirmação, exige JSON array com 1–1000 itens, valida objeto, tipo, descrição, valor e data no mês de destino.
- `copiar_mes_anterior`: exige que o mês de destino esteja exatamente em estado `aberto`, valida família e mantém a cópia restrita à família.
- `dividir_lancamento`: trava o lançamento, valida o mês aberto, rejeita IDs de membros externos à família e valores fixos malformados.
- `admin_salvar_config`: exige objeto JSON e limita a quantidade de configurações; mantém lista permitida de chaves e valida valores de Pix.

Todas as funções mantêm `SECURITY DEFINER` e `search_path` fixado em `public`; não foi revogada a execução autenticada porque o aplicativo depende dessas RPCs. A autorização continua sendo verificada dentro das funções.

## Configuração Auth

- Comprimento mínimo de senha ajustado para 8 caracteres no Dashboard.
- Proteção contra senhas vazadas permanece desabilitada: o Supabase informa que o recurso requer plano Pro ou superior. É uma limitação de plano, não uma falha de configuração corrigível no plano Free.

## Alertas que permanecem

- O Security Advisor ainda sinaliza 43 funções `SECURITY DEFINER` executáveis por usuários autenticados. Esse alerta é genérico: as RPCs fazem parte do aplicativo e precisam de autorização interna. Não revogar em lote sem revisar dependências.
- O alerta de proteção contra senhas vazadas permanece até habilitação em plano compatível.
- Índices de colunas de FK foram mantidos mesmo quando aparecem como não utilizados, pois podem apoiar joins e exclusões.

## Validação pendente

- Testar manualmente importação de arquivo válido/inválido, divisão fixa/proporcional/igual e cópia para mês aberto/fechado em uma família de teste.
- Executar o teste k6 gradualmente com usuários e família de teste; não há resultado de carga medido ainda.
- Fazer smoke test completo de cadastro, confirmação de e-mail, login, criação de família, fluxo Pix manual, bloqueio/desbloqueio e exportação.
- Revisar políticas de privacidade, termos, suporte e processo de confirmação manual antes de comercializar.

Nenhuma senha, JWT, service-role key ou dado financeiro real deve ser versionado neste repositório.
