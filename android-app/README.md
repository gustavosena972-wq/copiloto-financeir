# Aplicativo Android — Copiloto Financeiro

Esta pasta contém um invólucro Android isolado. O aplicativo web principal e o checkout Pix da web não são alterados.

## Estado atual

- WebView limitada ao host HTTPS oficial atualmente observado no backend: `gustavosena972-wq.github.io`.
- Ponte nativa Google Play Billing com produtos avulsos:
  - `copiloto_pro_30d`
  - `copiloto_max_30d`
  - `copiloto_ultra_30d`
- Consulta dos produtos e início do fluxo de compra implementados.
- Eventos enviados para a página:
  - `copiloto:play-bridge-ready`
  - `copiloto:play-products`
  - `copiloto:play-purchase`
  - `copiloto:play-pending`
  - `copiloto:play-cancelled`
  - `copiloto:play-error`

Exemplo de integração futura na camada Android da página (não incluído no app web ainda):

```js
window.addEventListener("copiloto:play-products", (event) => {
  console.log(event.detail.products);
});

window.addEventListener("copiloto:play-purchase", async (event) => {
  // Enviar purchaseToken ao endpoint autenticado do backend.
  // Nunca liberar ferramentas com base apenas neste evento.
});

window.CopilotoPlayBilling?.queryProducts();
window.CopilotoPlayBilling?.purchase("copiloto_pro_30d");
```

## Bloqueios antes de qualquer compra real

1. Confirmar com o responsável adulto o application ID definitivo. O valor atual `br.com.copiloto.financeiro` é provisório e não deve ser usado para registrar o app até a confirmação.
2. Confirmar que o endereço público configurado em `WEB_APP_URL` é o endereço de produção definitivo.
3. Cadastrar os três produtos avulsos no Play Console e confirmar os IDs exatamente como acima.
4. Implementar e implantar a verificação server-side pela Google Play Developer API antes de processar tokens.
5. Integrar o evento de compra à solicitação pendente do administrador, preservando aprovação manual e acesso familiar.
6. Só depois da validação no servidor, implementar consumo/acknowledgement e tratamento de reembolso/revogação.
7. Adicionar tratamento de compras já existentes ao iniciar/retomar o app, usando o backend como fonte de verdade.

**Não habilitar venda nem publicar esta versão ainda.** O cliente Android não confirma, consome ou concede acesso a compras. Isso é intencional até o backend validar o token. A Google exige que o app processe compras e confirme/consuma no prazo aplicável.

## Build

Requisitos locais: JDK 17, Android SDK 36 e Gradle 8.13+.

Na pasta `android-app`:

```bash
gradle assembleDebug
```

O pacote final e assinatura de release só devem ser configurados depois de confirmar o application ID e a conta de publicação.
