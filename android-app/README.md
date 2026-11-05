# Aplicativo Android — Copiloto Financeiro

Esta pasta contém o invólucro Android isolado. A página pública em `index.html` é institucional e não é o aplicativo completo. A experiência completa do aplicativo foi preservada em `mobile.html` (asset interno do Android); o Android WebView carrega essa entrada pelo Cloudflare Worker em `/app.html`. A versão Web institucional apresenta o produto e direciona a instalação para a Google Play.

## Integração implementada na branch

- Android nativo com Google Play Billing Library `9.1.0` e produtos avulsos: `copiloto_pro_30d`, `copiloto_max_30d`, `copiloto_ultra_30d`.
- Consulta dos produtos e preços formatados diretamente pela Google Play.
- Início de compra e tratamento de compra concluída, pendente, cancelada e restauração de compras existentes.
- Integração JavaScript de checkout mantida no `index.html`, usando diretamente a interface nativa `CopilotoPlayBilling`.
- O JavaScript envia o token para a Edge Function autenticada `google-play-purchase`.
- O servidor valida o token com a Google Play Developer API e cria uma solicitação pendente; não libera acesso sozinho.
- O painel administrativo tem ações separadas para aprovar ou recusar compras Google Play.
- A aprovação manual concede 30 dias; a recusa solicita reembolso e revogação.
- Migração SQL formal criada em `supabase/migrations/20261103210000_google_play_compras.sql`; ainda NÃO aplicada.

## Regras importantes

- Não há renovação automática: o produto é uma compra avulsa de 30 dias.
- A compra permanece sem acesso até a aprovação manual.
- A Google exige que compras sejam confirmadas/consumidas em até três dias após passarem para `PURCHASED`; se não, podem ser reembolsadas automaticamente. Portanto, a fila administrativa precisa ser monitorada diariamente e as decisões precisam ocorrer dentro do prazo.
- Não colocar a chave privada da conta de serviço no repositório, no HTML ou no app. Ela deve ficar somente em secrets do backend.
- O app ID `br.com.copiloto.financeiro` e a URL web atual são provisórios até confirmação do responsável adulto no Play Console.
- A versão Web no navegador ainda não usa Google Play Billing. Google Play Billing é o checkout do app Android; o programa de faturamento alternativo no Brasil é uma opção diferente, em que o pagamento é processado pelo desenvolvedor e não pelo Google. Não remover nem desativar o Pix da Web antes de existir uma solução de checkout Web aprovada e realmente funcional. A preferência de produto continua sendo não usar Pix, mas isso não pode ser prometido tecnicamente como resolvido.

## O que ainda bloqueia a publicação

1. Confirmar com o titular adulto o application ID definitivo, URL/origem e conta Play Console.
2. Criar os produtos no Play Console com os IDs exatos e preços aprovados (Pro R$ 23,90; Max R$ 35,90; Ultra R$ 59,90).
3. Configurar a conta de serviço Google e os secrets no Supabase pelo titular/responsável, sem compartilhar credenciais no chat.
4. Aplicar a migração somente em ambiente de desenvolvimento, revisar as referências de schema e rodar os testes de segurança; depois planejar produção separadamente.
5. Implantar e testar as Edge Functions em ambiente de desenvolvimento.
6. Testar compras, restauração, token duplicado, compra pendente, aprovação, recusa/reembolso, expiração, família e membros convidados com contas de teste.
7. Validar o comportamento de reembolso/revogação e a rotina de aprovação dentro do prazo de três dias.
8. Gerar AAB assinado com a configuração de assinatura controlada pelo titular adulto e executar a trilha de testes internos/fechados da Play Console.
9. Revisar política de privacidade, suporte, Data safety, classificação etária e ficha da loja.

## Build

Requisitos: JDK 17, Android SDK 36 e Gradle 8.13.

Na pasta `android-app`:

```bash
gradle assembleDebug
gradle bundleRelease
```

O APK debug serve para testes técnicos. O AAB gerado sem uma chave de assinatura de release configurada é apenas artefato de compilação e não está pronto para publicação.
