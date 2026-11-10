# Android 1.0.46 — corrigir geração do Checape

Os logs de Postgres registravam `permission denied for function
gerar_alertas_tendencia` (11 ocorrências observadas). A RPC pública
`gerar_checape(uuid)` é SECURITY INVOKER e chama dois geradores privados.
Authenticated podia executar o primeiro, mas não o gerador de tendência;
a falha revertia a operação inteira.

A migração `20261110125303_restore_checape_trend_execute.sql` concede somente
EXECUTE dessa função a authenticated. A função continua verificando o mês,
o vínculo familiar e a permissão de edição. Nenhum acesso anônimo, permissão
de tabela ou função SECURITY DEFINER nova foi adicionado. Migração aplicada.

Regressão PostgreSQL/PGlite: executa o wrapper e o gerador de tendência
capturados do servidor, usando dados fictícios e um gerador básico mínimo.
Reproduz a negação antes do grant e verifica geração autorizada, cálculo
do histórico familiar correto, repetição sem duplicar novas sugestões,
negação para outra família, leitor, identidade inexistente e anônimo.
Os dois corpos capturados em tests/fixtures/checape_functions.json são
fixtures de teste, sem dados de usuários e sem substituir a função publicada.

Em produção foram conferidos os privilégios e a recusa para identidade de
teste sem acesso/mês válido, em transação revertida. O Checape não foi
executado sobre dados financeiros reais durante a verificação.

O app continua com o mesmo produto da versão 1.0.45. A versão/código sobem para
1.0.46/46 para permitir uma nova entrega de teste interno. As mudanças da
tela inicial/valores continuam pausadas, conforme pedido anterior.
Compras permanecem bloqueadas; sem publicação automática na Google Play.
