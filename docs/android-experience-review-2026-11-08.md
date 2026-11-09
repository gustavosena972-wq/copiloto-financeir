# RevisÃ£o Android â€” 1.0.40

## Escopo implementado

As alteraÃ§Ãµes de interface ficam em `android-app/`. O site pÃºblico, o Cloudflare Workers e o repositÃ³rio de vitrine nÃ£o sÃ£o alterados.

- ApresentaÃ§Ã£o, recursos, planos, login e cadastro usam tipografia local e a paleta da primeira referÃªncia: azul noturno, ciano, violeta e Ã¢mbar. O nome Copiloto Financeiro tem uma transiÃ§Ã£o de entrada, com movimento reduzido respeitado. O TamanduÃ¡ foi retirado do fundo a pedido do usuÃ¡rio; suas imagens continuam nos planos e o modelo 3D pode ser aberto explicitamente para rotaÃ§Ã£o e aproximaÃ§Ã£o.
- O dashboard usa a segunda referÃªncia: cafÃ© e grafite, detalhes azuis, cartÃµes com profundidade, contraste alto, categorias e vencimentos calculados dos prÃ³prios lanÃ§amentos. Nenhum dado ou texto dos aplicativos de referÃªncia foi copiado. A Ã¡rea financeira mantÃ©m navegaÃ§Ã£o estÃ¡vel: InÃ­cio, Planilha, TamanduÃ¡, Metas e Mais. A anÃ¡lise mensal vem antes da abertura da planilha.
- Boas-vindas opcionais depois do login/cadastro e antes de usar a Ã¡rea financeira, com configuraÃ§Ã£o ou opÃ§Ã£o de pular. Nome e objetivo informados sÃ£o associados Ã  prÃ³pria conta autenticada; nÃ£o sÃ£o guardados em armazenamento local compartilhado.
- Chat em tela inteira, sem cabeÃ§alho de famÃ­lia, filtros ou avisos de teste por cima. Mensagens em coluna central, sugestÃµes editÃ¡veis, nova conversa, histÃ³rico filtrado pelo usuÃ¡rio e famÃ­lia atuais, e descarte de respostas iniciadas em outra sessÃ£o ou conversa. A Ã¡rea privada Ã© limpa antes de qualquer espera de rede na troca de sessÃ£o.
- CÃ¡lculos em centavos, datas reais e simulaÃ§Ã£o explicitamente ilustrativa. Despesas pendentes sÃ£o descontadas uma vez; saldo de lanÃ§amentos nÃ£o Ã© apresentado como saldo bancÃ¡rio.
- Ditado pelo serviÃ§o de reconhecimento do Android, iniciado pelo usuÃ¡rio, com texto revisÃ¡vel antes de enviar. SolicitaÃ§Ãµes e retornos sÃ£o vinculados Ã  sessÃ£o; ditado de uma conversa anterior Ã© descartado. Disponibilidade de idiomas depende do aparelho.
- ImportaÃ§Ã£o pelo seletor de documentos do Android e exportaÃ§Ã£o CSV/XLSX/JSON com confirmaÃ§Ã£o de gravaÃ§Ã£o, limite de 8 MB e neutralizaÃ§Ã£o de fÃ³rmulas em CSV.

## Arte e desempenho

Imagem de planos em alta densidade, marca vetorial e personagem original com pelagem geomÃ©trica, roupa e texturas locais. O modelo usa quantizaÃ§Ã£o de 16 bits e cerca de 192 mil polÃ­gonos; o GLB tem aproximadamente 10,6 MB antes da compressÃ£o do APK. O formato nÃ£o exige Draco, WebAssembly ou `unsafe-eval`. A tentativa anterior com Draco ficou presa no carregamento e foi descartada.

O modelo 3D sÃ³ Ã© carregado ao tocar em Ver personagem 3D. NÃ£o ocupa o fundo do produto nem roda durante o uso da planilha. O desenho abstrato de cartÃµes flutuantes foi removido. ReduÃ§Ã£o de movimento e um controle de movimento sÃ£o respeitados. A roupa do modelo giratÃ³rio Ã© Ãºnica nesta etapa; as imagens dos planos apresentam as variantes existentes.

## EvidÃªncias e limites

41 testes Node verificam cÃ¡lculos, navegaÃ§Ã£o, descarte de respostas de sessÃ£o/perÃ­odo anterior e exportaÃ§Ã£o. O verificador Python analisa os cinco scripts inline, arquivos externos e orÃ§amento dos assets. O validador glTF nÃ£o encontrou erros nem avisos no modelo final. A apresentaÃ§Ã£o, o dashboard e o chat foram inspecionados no navegador com dados fictÃ­cios, sem sessÃ£o Supabase, em composiÃ§Ã£o ampla e em um frame de 390 px.

O workflow `android-signed-review.yml` executa essas verificaÃ§Ãµes e os testes Kotlin, gera APK e AAB com a chave jÃ¡ configurada no repositÃ³rio, verifica as assinaturas e publica somente um artefato de revisÃ£o. NÃ£o envia a versÃ£o Ã  Google Play. O artefato interno usa `-PcopilotoInternalTest=true`: o cÃ³digo nativo bloqueia compras e a interface nÃ£o abre checkout. A liberaÃ§Ã£o de acesso continua dependendo da lista autenticada de testadores do servidor; o modo de teste nÃ£o concede acesso a contas desconhecidas. Para a versÃ£o pÃºblica, gerar outro pacote sem essa propriedade. Os produtos e preÃ§os continuam configurados.

Ainda requer teste em Android fÃ­sico: seletor de arquivos, teclado, TalkBack, voz, desempenho tÃ©rmico/GPU e fluxo real de autenticaÃ§Ã£o. NÃ£o foi atribuÃ­da uma nota artificial de 8,5. Os testes existentes e os novos testes sÃ£o evidÃªncia parcial, nÃ£o uma garantia absoluta de ausÃªncia de falhas.

## Outras etapas do relatÃ³rio

O backend de contexto financeiro autoritativo e memÃ³ria isolada estÃ¡ no PR #87. Em 09/11/2026, a migraÃ§Ã£o foi aplicada e a funÃ§Ã£o tamandua-bot foi publicada como versÃ£o 7, com verificaÃ§Ã£o JWT mantida. A leitura posterior confirmou o cÃ³digo publicado, as polÃ­ticas de propriedade e a resposta HTTP 401 para acesso sem sessÃ£o. A anÃ¡lise autenticada com uma conta real ainda deve ser validada no teste interno. Esta interface nÃ£o implementa pagamento autÃ´nomo, tarefas financeiras executÃ¡veis, treinamento permanente do modelo, notificaÃ§Ãµes push nem processamento contÃ­nuo apÃ³s sair. Os textos da interface nÃ£o anunciam essas funÃ§Ãµes como disponÃ­veis.

## Reproduzir a cena

Three.js 0.183.2 e esbuild 0.25.12, com GLTFLoader, TextureLoader, OrbitControls, RoomEnvironment e PMREMGenerator. O bundle e a licenÃ§a MIT sÃ£o locais. Fraunces possui licenÃ§a OFL incluÃ­da. `android-app/tools/create_tamandua.py` gera o modelo em uma sessÃ£o Blender vazia. Corrigir UVs das peÃ§as de gola antes de exportar e usar glTF Transform 4.5.1 com `quantize --quantize-position 16 --quantize-normal 16 --quantize-texcoord 16`; nÃ£o usar Draco na versÃ£o atual.

As verificaÃ§Ãµes de seguranÃ§a do Supabase mantÃªm dois apontamentos anteriores: uma tabela privada sem polÃ­ticas (sem acesso liberado por isso) e proteÃ§Ã£o contra senhas vazadas desativada. Nenhum dado real de famÃ­lia foi usado na prÃ©via.\n

## Ajustes finais de 09/11

A apresentação Android usa uma cena Three.js contínua: os mesmos segmentos e barras se afastam e se recompõem conforme a rolagem entre apresentação, recursos e planos. Não há troca automática de página. A cena pausa ao ocultar o app ou editar campos e respeita movimento reduzido; existe alternativa CSS quando WebGL não está disponível.

O chat possui conversa ampla, histórico e ferramentas em lateral; no celular, a lateral abre em um menu modal. Verde floresta, creme e latão unem chat e configuração pós-login. O retrato usa a roupa formal da ilustração original em alta densidade; o personagem giratório continua sendo o modelo local, sem afirmar qualidade fotográfica.

Lembretes locais opcionais usam WorkManager e permissão Android. Sincronizam vencimentos do contexto autorizado e guardam somente datas e hash de conta/família, por até sete dias. Logout ou mudança de identidade cancela os lembretes anteriores. A notificação é genérica e possui botão OK; o sistema Android controla entrega e duração flutuante. Não há processamento contínuo de IA, FCM ou execução de pagamentos. As preferências passam a ter chave composta usuário/família, preservando RLS e os registros existentes.

Verificações: 41 testes Node; três novos testes Kotlin para consentimento, expiração e separação de identidade, além da suíte existente. A entrega em aparelho físico, inclusive com restrições de bateria, precisa ser validada pelos testadores.


## Navegação lateral e reconstrução do conteúdo

O menu geral deixou de ocupar uma faixa permanente no painel. Áreas abre uma gaveta lateral com os mesmos destinos e permissões; escolher um destino fecha a gaveta. No chat, Áreas abre a navegação geral; Conversas e ferramentas abre o histórico do Tamanduá. Os atalhos de celular foram preservados. A gaveta usa dialog modal, conserva foco e fecha com Voltar/Escape.

A reconstrução agora transforma os próprios títulos, textos, ilustração e cartões conforme a rolagem: as peças se deslocam de lados opostos, mudam perspectiva e recuperam o recorte. A área de leitura permanece montada, sem rolagem forçada. A cena 3D fixa de fundo deixou de ser carregada. Movimento reduzido e a preferência de desligar movimento restauram conteúdo estático; campos em edição ficam estáveis. Três testes verificam montagem, limites e leitura de painéis longos.
