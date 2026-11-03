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

**Atenção:** ainda não há schema ou função de servidor de Google Play Billing neste repositório. Não se deve inventar o schema nem implantar alterações no Supabase sem validar as tabelas/RPCs atuais e preparar migração reversível.

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
