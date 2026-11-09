# Revisão Android — 1.0.40

## Escopo implementado

As alterações de interface ficam em `android-app/`. O site público, o Cloudflare Workers e o repositório de vitrine não são alterados.

- Apresentação, recursos, planos, login e cadastro usam uma cena Three.js contínua, tipografia local e uma paleta verde, creme e dourada. O personagem pode ser examinado em um diálogo com rotação e aproximação.
- A área financeira mantém navegação estável: Início, Planilha, Tamanduá, Metas e Mais. A análise mensal vem antes da abertura da planilha.
- Boas-vindas opcionais depois do login/cadastro e antes de usar a área financeira, com configuração ou opção de pular. Nome e objetivo informados são associados à própria conta autenticada; não são guardados em armazenamento local compartilhado.
- Chat com área própria, sugestões editáveis, histórico filtrado pelo usuário e família atuais, e descarte de respostas iniciadas em outra sessão.
- Cálculos em centavos, datas reais e simulação explicitamente ilustrativa. Despesas pendentes são descontadas uma vez; saldo de lançamentos não é apresentado como saldo bancário.
- Importação pelo seletor de documentos do Android e exportação CSV/XLSX/JSON com confirmação de gravação, limite de 8 MB e neutralização de fórmulas em CSV.

## Arte e desempenho

Imagem de planos em alta densidade, marca vetorial e personagem original com pelagem geométrica, roupa e texturas locais. O modelo usa quantização de 16 bits e cerca de 192 mil polígonos; o GLB tem aproximadamente 10,6 MB antes da compressão do APK. O formato não exige Draco, WebAssembly ou `unsafe-eval`. A tentativa anterior com Draco ficou presa no carregamento e foi descartada.

Uma única cena é reutilizada entre as telas de apresentação e o diálogo do personagem. Ela para fora da apresentação, com o aplicativo oculto e durante edição. Redução de movimento e um controle de movimento são respeitados. Há fallback estático em caso de falha do 3D. A roupa do modelo giratório é única nesta etapa; as imagens dos planos apresentam as variantes existentes.

## Evidências e limites

30 testes Node verificam cálculos, navegação, descarte de respostas de sessão/período anterior e exportação. O verificador Python analisa os cinco scripts inline, arquivos externos e orçamento dos assets. O validador glTF não encontrou erros nem avisos no modelo final. A apresentação foi inspecionada no navegador com dados fictícios, sem sessão Supabase.

O workflow `android-signed-review.yml` executa essas verificações e os testes Kotlin, gera APK e AAB com a chave já configurada no repositório, verifica as assinaturas e publica somente um artefato de revisão. Não envia a versão à Google Play.

Ainda requer teste em Android físico: seletor de arquivos, teclado, TalkBack, voz, desempenho térmico/GPU e fluxo real de autenticação. Não foi atribuída uma nota artificial de 8,5. Os testes existentes e os novos testes são evidência parcial, não uma garantia absoluta de ausência de falhas.

## Outras etapas do relatório

O backend de contexto financeiro autoritativo e memória isolada está no PR #87 e precisa de implantação separada; não se confunde com código já publicado. Esta interface não implementa pagamento autônomo, tarefas financeiras executáveis, treinamento permanente do modelo, notificações push nem processamento contínuo após sair. Os textos da interface não anunciam essas funções como disponíveis.

## Reproduzir a cena

Three.js 0.183.2 e esbuild 0.25.12, com GLTFLoader, TextureLoader, OrbitControls, RoomEnvironment e PMREMGenerator. O bundle e a licença MIT são locais. Fraunces possui licença OFL incluída. `android-app/tools/create_tamandua.py` gera o modelo em uma sessão Blender vazia. Corrigir UVs das peças de gola antes de exportar e usar glTF Transform 4.5.1 com `quantize --quantize-position 16 --quantize-normal 16 --quantize-texcoord 16`; não usar Draco na versão atual.
