# Revisão Android — 1.0.40

## Escopo implementado

As alterações de interface ficam em `android-app/`. O site público, o Cloudflare Workers e o repositório de vitrine não são alterados.

- Apresentação, recursos, planos, login e cadastro usam tipografia local e a paleta da primeira referência: azul noturno, ciano, violeta e âmbar. O nome Copiloto Financeiro tem uma transição de entrada, com movimento reduzido respeitado. O Tamanduá foi retirado do fundo a pedido do usuário; suas imagens continuam nos planos e o modelo 3D pode ser aberto explicitamente para rotação e aproximação.
- O dashboard usa a segunda referência: café e grafite, detalhes azuis, cartões com profundidade, contraste alto, categorias e vencimentos calculados dos próprios lançamentos. Nenhum dado ou texto dos aplicativos de referência foi copiado. A área financeira mantém navegação estável: Início, Planilha, Tamanduá, Metas e Mais. A análise mensal vem antes da abertura da planilha.
- Boas-vindas opcionais depois do login/cadastro e antes de usar a área financeira, com configuração ou opção de pular. Nome e objetivo informados são associados à própria conta autenticada; não são guardados em armazenamento local compartilhado.
- Chat em tela inteira, sem cabeçalho de família, filtros ou avisos de teste por cima. Mensagens em coluna central, sugestões editáveis, nova conversa, histórico filtrado pelo usuário e família atuais, e descarte de respostas iniciadas em outra sessão ou conversa.
- Cálculos em centavos, datas reais e simulação explicitamente ilustrativa. Despesas pendentes são descontadas uma vez; saldo de lançamentos não é apresentado como saldo bancário.
- Ditado pelo serviço de reconhecimento do Android, iniciado pelo usuário, com texto revisável antes de enviar. Solicitações e retornos são vinculados à sessão; ditado de uma conversa anterior é descartado. Disponibilidade de idiomas depende do aparelho.
- Importação pelo seletor de documentos do Android e exportação CSV/XLSX/JSON com confirmação de gravação, limite de 8 MB e neutralização de fórmulas em CSV.

## Arte e desempenho

Imagem de planos em alta densidade, marca vetorial e personagem original com pelagem geométrica, roupa e texturas locais. O modelo usa quantização de 16 bits e cerca de 192 mil polígonos; o GLB tem aproximadamente 10,6 MB antes da compressão do APK. O formato não exige Draco, WebAssembly ou `unsafe-eval`. A tentativa anterior com Draco ficou presa no carregamento e foi descartada.

O modelo 3D só é carregado ao tocar em Ver personagem 3D. Não ocupa o fundo do produto nem roda durante o uso da planilha. O desenho abstrato de cartões flutuantes foi removido. Redução de movimento e um controle de movimento são respeitados. A roupa do modelo giratório é única nesta etapa; as imagens dos planos apresentam as variantes existentes.

## Evidências e limites

34 testes Node verificam cálculos, navegação, descarte de respostas de sessão/período anterior e exportação. O verificador Python analisa os cinco scripts inline, arquivos externos e orçamento dos assets. O validador glTF não encontrou erros nem avisos no modelo final. A apresentação, o dashboard e o chat foram inspecionados no navegador com dados fictícios, sem sessão Supabase, em composição ampla e em um frame de 390 px.

O workflow `android-signed-review.yml` executa essas verificações e os testes Kotlin, gera APK e AAB com a chave já configurada no repositório, verifica as assinaturas e publica somente um artefato de revisão. Não envia a versão à Google Play. O artefato interno usa `-PcopilotoInternalTest=true`: o código nativo bloqueia compras e a interface não abre checkout. A liberação de acesso continua dependendo da lista autenticada de testadores do servidor; o modo de teste não concede acesso a contas desconhecidas. Para a versão pública, gerar outro pacote sem essa propriedade. Os produtos e preços continuam configurados.

Ainda requer teste em Android físico: seletor de arquivos, teclado, TalkBack, voz, desempenho térmico/GPU e fluxo real de autenticação. Não foi atribuída uma nota artificial de 8,5. Os testes existentes e os novos testes são evidência parcial, não uma garantia absoluta de ausência de falhas.

## Outras etapas do relatório

O backend de contexto financeiro autoritativo e memória isolada está no PR #87. Em 09/11/2026, a migração foi aplicada e a função tamandua-bot foi publicada como versão 7, com verificação JWT mantida. A leitura posterior confirmou o código publicado, as políticas de propriedade e a resposta HTTP 401 para acesso sem sessão. A análise autenticada com uma conta real ainda deve ser validada no teste interno. Esta interface não implementa pagamento autônomo, tarefas financeiras executáveis, treinamento permanente do modelo, notificações push nem processamento contínuo após sair. Os textos da interface não anunciam essas funções como disponíveis.

## Reproduzir a cena

Three.js 0.183.2 e esbuild 0.25.12, com GLTFLoader, TextureLoader, OrbitControls, RoomEnvironment e PMREMGenerator. O bundle e a licença MIT são locais. Fraunces possui licença OFL incluída. `android-app/tools/create_tamandua.py` gera o modelo em uma sessão Blender vazia. Corrigir UVs das peças de gola antes de exportar e usar glTF Transform 4.5.1 com `quantize --quantize-position 16 --quantize-normal 16 --quantize-texcoord 16`; não usar Draco na versão atual.
\nAs verificações de segurança do Supabase mantêm dois apontamentos anteriores: uma tabela privada sem políticas (sem acesso liberado por isso) e proteção contra senhas vazadas desativada. Nenhum dado real de família foi usado na prévia.\n