# Materiais da loja e contas novas

A marca do Tamanduá usada na Play deve corresponder ao ícone vetorial declarado no AndroidManifest, com variante adaptativa no Android 8 ou superior. O ícone da loja usa PNG 512 × 512; o recurso gráfico usa PNG RGB 1024 × 500. As capturas são produzidas da interface Android atual em 1080 × 1920, com dados fictícios e sem acesso ao banco real. Recursos do Negócios devem ser identificados como piloto Alpha enquanto sua contratação estiver indisponível.

Os arquivos e a fábrica de demonstração ficam fora de `android-app/app/src/main/assets`. A verificação dos assets rejeita identidades e funções da fábrica de capturas dentro do pacote Android. O código distribuído inicia os lançamentos em uma lista vazia e carrega apenas os registros autorizados do espaço da conta autenticada.

Na revisão de 18/11/2026, a função ativa `private.criar_familia(text)` cria o espaço, vínculo do responsável, ano, meses, categorias e uma Carteira sem inserir lançamentos, metas, dívidas ou patrimônio de demonstração. As tabelas criadas não têm gatilhos de criação de dados financeiros de exemplo. A verificação foi de código e metadados do banco, sem cadastrar pessoas fictícias no ambiente ativo.

A apresentação inicial do Android usa marcadores vazios em vez de receitas, despesas, percentuais e transações simuladas. A conta nova permanece vazia até a pessoa cadastrar ou importar informações. Contas existentes preservam seus registros reais.

O cartão Negócios apresenta caixa, movimentações, vencimentos, resultados, planejamento, catálogo e apoio do Tamanduá, com preço proposto de R$ 69,90 por 30 dias e disponibilidade no piloto Alpha. Ele não redireciona para um produto Pro, Max ou Ultra como se fosse uma compra do plano empresarial. O catálogo de cobrança de Negócios exige configuração e validação próprias antes da contratação.

Conferência manual: criar uma conta de teste autorizada, configurar um espaço novo, confirmar ausência de lançamentos e catálogo de serviços, importar somente após escolher um arquivo, sair da conta e conferir que os dados anteriores foram limpos. A auditoria de código não substitui esse teste em aparelho físico.

Referência dos formatos: https://support.google.com/googleplay/android-developer/answer/9866151?hl=pt-BR
