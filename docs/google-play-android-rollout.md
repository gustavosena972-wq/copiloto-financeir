# Preparação Android e Google Play — Copiloto Financeiro

## Objetivo e limite de escopo

Preparar uma versão Android distribuída pela Google Play sem reconstruir o produto e sem alterar as ferramentas já existentes.

**Não alterar:** cadastro/login/recuperação, famílias e convites, permissões, importação/exportação, módulos financeiros, painel administrativo, banco de dados funcional da versão web e checkout Pix da versão web.

**Alterar somente:** empacotamento Android, identificação do ambiente Play Store, compra Android via Google Play Billing e integração segura da confirmação de compra com o fluxo de autorização manual já usado pelo administrador.

Esta preparação é isolada em branch própria. Não publicar no GitHub Pages, não fazer deploy no Supabase e não mesclar em `main` sem revisão e autorização.

## Comportamento aprovado

1. A versão web continua com Pix e preços atuais: Pro R$ 20, Max R$ 30, Ultra R$ 50 por 30 dias.
2. A versão Android distribuída pela Play Store não apresenta chave, QR Code, botão ou instrução para pagamento Pix externo dentro do app.
3. A compra Android usa Google Play Billing e os preços de planejamento são Pro R$ 23,90, Max R$ 35,90 e Ultra R$ 59,90. Os preços só devem ser publicados depois de cadastrados e conferidos no Play Console.
4. A compra é avulsa, com validade de 30 dias e renovação manual pelo cliente; não é assinatura com renovação automática.
5. Uma compra confirmada pela Google Play **não libera automaticamente** as ferramentas. O backend valida a compra e registra uma solicitação pendente; o administrador continua sendo a única pessoa que autoriza a ativação pelo painel já existente.
6. Enquanto não houver autorização administrativa e período de acesso ativo, a conta permanece na tela de acesso pendente. A tela não pode ser a única proteção: as operações protegidas precisam continuar respeitando a autorização validada no backend.
7. Membros convidados continuam sujeitos ao acesso da família; não devem comprar outro plano individualmente.
8. Contas e planos já ativos não podem ser desativados pela simples instalação/atualização da versão Android.

## Descobertas do repositório (branch main, 2026-11-03)

- O app principal está concentrado em `index.html`; a versão é uma aplicação web estática com Supabase.
- Existe uma tela `renderPaywall()` que mostra o checkout Pix e uma verificação de acesso no boot baseada em `eh_admin` e `familias.acesso_ate`.
- O painel administrativo já lista solicitações e usa a RPC `aprovar_pagamento` para liberar dias de acesso.
- O fluxo Pix web grava solicitações na tabela `pagamentos`; esse fluxo deve permanecer disponível na web.
- O manifesto PWA atual é mínimo e não há projeto Android, Gradle, Capacitor/TWA, integração Billing Library, IDs de produtos Play ou verificação de tokens Google identificados na árvore do repositório.
- Portanto, não é seguro apenas esconder o Pix por detecção de navegador: a distribuição Android precisa ter uma ponte nativa real para Play Billing e validação de compra no servidor.

## Arquitetura de integração necessária

### Android

- Escolher e configurar o empacotamento Android depois de confirmar o domínio/origem oficial da aplicação e o identificador de pacote.
- Integrar Google Play Billing com produtos avulsos (one-time products), não subscriptions de renovação automática.
- Usar IDs estáveis e separados, por exemplo `copiloto_pro_30d`, `copiloto_max_30d`, `copiloto_ultra_30d` (IDs propostos; ainda não cadastrados).
- A tela Android de planos chama o fluxo nativo de compra. A tela web continua chamando o fluxo Pix web.
- O cliente nunca pode informar livremente que pagou, nem enviar apenas um valor/preço como prova.

### Backend e aprovação manual

- Criar uma função de servidor para receber o identificador do produto, token de compra e identidade autenticada.
- Validar o token com a Google Play Developer API no servidor, conferindo package name, produto, estado da compra e usuário/família associados.
- Só depois da validação registrar uma solicitação de compra Play pendente para o administrador. Não marcar a família como ativa nessa etapa.
- O painel atual deve exibir a origem da solicitação (Google Play) e o plano validado. A ação administrativa existente de aprovar/recusar permanece sob controle do administrador.
- A aprovação deve conceder 30 dias, registrar idempotência para evitar duplicidade de token e preservar o histórico.
- Configurar notificações de compra/reembolso/cancelamento e reconciliação do estado de compra, para que reembolsos e revogações não deixem acesso indevido.
- Segredos de conta de serviço Google ficam somente em secrets do backend; nunca no HTML, app Android ou repositório.

**Atenção:** a branch agora contém um script SQL separado e duas Edge Functions de referência para o fluxo Google Play. Eles ainda não foram aplicados nem implantados. O SQL precisa ser convertido em migração formal, revisado e testado em ambiente de desenvolvimento antes de qualquer implantação.

## Bloqueio de acesso

Estados esperados:

- Sem plano ativo e sem compra validada: mostrar tela de contratação/acesso pendente.
- Compra validada, aguardando decisão administrativa: mostrar “Pagamento confirmado pela Google Play; aguardando liberação do administrador”; manter ferramentas bloqueadas.
- Compra recusada: mostrar estado recusado e instrução de suporte, sem liberar ferramentas.
- Administrador aprovou e `acesso_ate` está no futuro: liberar exatamente as ferramentas já existentes.
- Plano expirado: bloquear novamente, preservando os dados.
- Administrador: manter a exceção administrativa atual.

O controle efetivo deve continuar no backend/RLS/RPCs; não basta esconder elementos da interface.

## Dados e acessos necessários antes da integração executável

- Operador adulto legalmente responsável pela conta Play Console, contratos, recebimentos, suporte e dados pessoais. O titular da conta Play Console e os dados bancários devem ser do responsável autorizado.
- URL/origem oficial de produção e confirmação de domínio.
- Application ID/package name Android definitivo.
- Conta Play Console configurada e aplicativo criado nela.
- IDs e produtos cadastrados no Play Console com preços finais.
- Acesso de serviço/API do Google Play Developer API configurado com permissões mínimas.
- Secrets configurados no projeto Supabase pelo responsável; nenhuma chave privada deve ser enviada no chat ou commitada.
- Política de privacidade pública, informações de suporte, classificação etária, Data safety e materiais da ficha da loja.

## Plano de implementação e validação

1. Confirmar domínio/origem e package name; escolher TWA ou Capacitor conforme os requisitos reais. Não presumir que a página GitHub Pages, sem validação, é uma origem de produção adequada.
2. Criar o invólucro Android em diretório isolado, sem modificar o app web.
3. Implementar a ponte Google Play Billing e estados de compra no Android.
4. Implementar verificação de token no servidor e solicitação pendente integrada ao painel atual.
5. Fazer o gate de acesso depender do estado validado no backend, sem alterar a regra de administrador ou os recursos do app.
6. Testar com licença/teste interno: compra aprovada, compra cancelada, token repetido, produto errado, usuário/família divergente, espera pela autorização manual, recusa, expiração, reembolso/revogação e membro convidado.
7. Executar regressão das funções existentes e conferir que o Pix web continua funcionando.
8. Só então preparar AAB, assinatura, ficha da loja e trilha de teste fechado.

## Critério de conclusão

A integração só será considerada pronta quando os testes acima passarem, a compra Android for validada no servidor, o painel administrativo continuar sendo o único caminho de liberação, o Pix web permanecer intacto e o AAB passar pela trilha de teste da Play Console.

Nenhum pagamento real, publicação, deploy no Supabase ou merge em `main` é realizado por esta preparação.


## Regras adicionais confirmadas na documentação oficial Google Play (03/11/2026)

- Os planos de 30 dias devem ser cadastrados como produtos avulsos consumíveis, pois o cliente precisa poder comprar novamente após o período. Não usar assinatura com renovação automática.
- O backend deve consultar o estado atual do token pela Google Play Developer API e só tratar a compra como válida quando o estado for `PURCHASED`. Tokens devem ser únicos/idempotentes no banco.
- Produtos consumíveis precisam ser consumidos para permitir recompra. A confirmação/consumo não pode ocorrer antes da validação no servidor. A Google informa que compras não confirmadas em até três dias podem ser reembolsadas automaticamente.
- Como o Copiloto mantém aprovação administrativa manual, será necessário um procedimento operacional para analisar as solicitações dentro desse prazo. Se o administrador recusar uma compra já paga, o fluxo deverá prever reembolso/revogação apropriado; não se pode simplesmente reter o pagamento e deixar o cliente sem resposta.
- O titular da conta Play Console precisa ter pelo menos 18 anos. Como o usuário que está conduzindo este projeto é menor de idade, a conta, os contratos, a identidade e os dados financeiros da publicação precisam ficar sob responsabilidade de um adulto autorizado, sem falsificar idade ou identidade.
- Antes de distribuir, o responsável precisa conferir as declarações de público-alvo, privacidade e classificação etária. O repositório atual contém um checklist que registra exigência de 18 anos nos Termos; isso precisa ser revisado por um responsável legal e alinhado com o público real do produto, sem declarar uma faixa etária incorreta.

Referências oficiais:
- https://developer.android.com/google/play/billing/lifecycle/one-time
- https://developer.android.com/google/play/billing/integrate
- https://support.google.com/googleplay/android-developer/answer/6112435
- https://support.google.com/googleplay/android-developer/answer/9867159


## Implementação adicionada na branch de preparação

Arquivos adicionados nesta etapa:

- `android-app/`: projeto Android isolado, WebView restrita ao endereço atual do app e ponte nativa Google Play Billing.
- `android-play-billing.js`: camada isolada que troca o checkout Pix somente quando a ponte Android existe. Em navegador comum, o script não altera o checkout web.
- `supabase/functions/google-play-purchase/index.ts`: valida a sessão, consulta a família da conta, verifica o token pela Google Play Developer API, cria uma solicitação pendente com token único e confirma a compra sem consumi-la.
- `supabase/functions/google-play-admin/index.ts`: ação administrativa autenticada; na aprovação, consome a compra no servidor e concede 30 dias via RPC; na recusa, solicita reembolso com revogação antes de marcar a compra como recusada.
- `supabase/sql/google_play_compras.sql`: script SQL separado para a tabela isolada e RPCs administrativas. É um script de implantação revisável, ainda não aplicado ao banco.
- `.github/workflows/android-build.yml`: compilação automática do APK de depuração.

### Limites e segurança desta etapa

- Nenhum deploy foi feito no Supabase e nenhum secret foi criado.
- Nenhuma compra real pode ser concluída até a criação da tabela/RPCs no projeto, implantação das duas Edge Functions e configuração dos secrets `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` e `GOOGLE_PLAY_PACKAGE_NAME`.
- A chave privada da conta de serviço Google não deve ser colocada no GitHub nem enviada em conversa.
- O identificador Android e a origem web configurados no projeto Android são provisórios e precisam de confirmação antes da publicação.
- A compra fica pendente e sem acesso até decisão manual. O backend confirma (acknowledge) a compra assim que ela é verificada e registrada, dentro do prazo de três dias da Google Play, mas não consome o produto nesse momento. A aprovação manual consome o produto e libera 30 dias; a rejeição solicita reembolso e revogação. A fila ainda precisa ser acompanhada para evitar demora excessiva e resolver exceções.
- O script SQL está em `supabase/sql/` como implantação separada para revisão. Antes de produção, deve ser convertido em migração formal e testado em ambiente de desenvolvimento, sem alterar as tabelas e RPCs Pix existentes.
- O build ainda precisa concluir e o APK de depuração não é um AAB assinado para publicação.


## Atualização de decisão e estado (03/11/2026)

### Decisão do produto

- O responsável quer que os pagamentos sejam processados pela Google Play, inclusive na experiência Web, e não quer Pix.
- A implementação Google Play Billing nesta branch atende ao checkout nativo do app Android. Ela não cria checkout Google Play para navegadores comuns.
- O Brasil aparece na lista oficial de países com programa de faturamento alternativo no app. Esse programa não significa que o Google Play processará o pagamento: o pagamento alternativo é processado pelo desenvolvedor e precisa de integração e declarações próprias. Como a decisão é usar pagamento processado pelo Google, não ativar esse programa como se fosse Google Play Billing.
- Portanto, o Pix da Web não deve ser removido até existir uma solução Web que realmente processe o pagamento pelo Google e seja permitida para esse caso. A versão Android, quando executada dentro do app nativo, esconde o checkout Pix e usa a ponte Billing.

### Revisão do que já existe

- A ponte nativa não é apenas uma ideia: `android-app/app/src/main/java/br/com/copiloto/financeiro/MainActivity.kt` já implementa consulta de produtos, início de compra, restauração e eventos para a WebView.
- `android-play-billing.js` conecta os eventos ao backend e o painel administrativo chama a Edge Function de aprovação/recusa.
- A migração formal foi criada em `supabase/migrations/20261103210000_google_play_compras.sql`, com acesso à tabela reservado ao `service_role` e funções administrativas protegidas. Ela continua sem aplicação.
- O build foi ampliado para compilar APK debug e AAB release não assinado; um AAB sem assinatura não pode ser publicado.

### Risco operacional obrigatório

Compras avulsas `PURCHASED` precisam ser confirmadas (acknowledged) em até três dias. O backend agora confirma a compra após validar e gravar a solicitação pendente, sem consumir o produto antes da decisão administrativa. Na aprovação, o servidor consome o produto e libera 30 dias. Na recusa, solicita reembolso e revogação. Antes de abrir compras reais, ainda é obrigatório testar esses três caminhos e tratar falhas/repetições; não se deve aprovar uma compra que já tenha sido reembolsada.

### Estado de implantação

- Código: branch de preparação; PR #25 continua aberto.
- SQL: migration adicionada ao GitHub, mas não executada.
- Edge Functions: código no GitHub, não implantado.
- Secrets Google: não configurados.
- Produtos Play Console: não criados/verificados.
- Compras reais: não testadas.
- Publicação: não feita; nenhum merge em `main`.

Referências oficiais consultadas:
- https://developer.android.com/google/play/billing/lifecycle/one-time
- https://developer.android.com/google/play/billing/integrate
- https://support.google.com/googleplay/answer/11174377
- https://support.google.com/googleplay/android-developer/answer/14372887
