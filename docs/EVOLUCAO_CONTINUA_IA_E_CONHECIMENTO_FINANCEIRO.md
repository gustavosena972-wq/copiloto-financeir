# Evolução contínua do Copiloto Financeiro

**Status:** diretriz de produto aprovada; implementação de inteligência adaptativa e ingestão automática ainda não está ativada.

## Objetivo

O Copiloto Financeiro deve melhorar com o uso, sem modificar silenciosamente suas regras financeiras nem apresentar conteúdo não verificado como fato. A evolução será contínua, mensurável, auditável e limitada por privacidade.

## 1. Aprendizado com as conversas

A evolução individual deve usar memória estruturada e controlada, não retreinamento automático do modelo a cada mensagem.

Sinais permitidos, após informar o usuário e obter a escolha de privacidade necessária:

- preferências de explicação: mais simples, passo a passo ou mais detalhada;
- temas que a pessoa escolheu acompanhar, como organização, economia, contas, dívidas e metas;
- feedback explícito sobre a utilidade de respostas;
- contexto de preferências que o próprio usuário possa consultar, corrigir ou apagar.

Regras:

- separar memória por usuário e, quando fizer sentido, por família;
- aplicar RLS e autorização no backend em todas as leituras e gravações;
- não inferir ou persistir senhas, chaves Pix, credenciais, números completos de contas/cartões ou outros segredos;
- não usar dados de um cliente para responder a outro;
- não transformar conversas privadas em material de treinamento compartilhado;
- oferecer controles para consultar, corrigir, desativar e apagar a memória;
- manter cálculos, saldos, regras de acesso e permissões determinísticos, testados e auditáveis.

As tabelas `conversas_ia` e `mensagens_ia` já existem no banco, mas sua existência não significa que exista uma experiência de IA ativa. A integração deve ser verificada e reutilizada somente depois de uma auditoria de finalidade, acesso e retenção. Não criar um segundo histórico de conversas sem necessidade.

## 2. Biblioteca financeira atualizada em segundo plano

Quando o aplicativo não estiver sendo usado, a coleta deve acontecer no backend, por tarefas agendadas. O celular não precisa ficar aberto ou executando processos em segundo plano.

Fluxo pretendido:

1. Consultar uma lista curada de fontes públicas e autorizadas.
2. Buscar novas publicações respeitando limites, termos de uso e políticas de acesso.
3. Registrar URL de origem, título, instituição, data de publicação, data da coleta, tema e estado de validação.
4. Deduplicar e verificar datas, versões e atualizações.
5. Gerar sínteses próprias e indexar conteúdo autorizado para recuperação contextual.
6. Disponibilizar os itens validados para o Copiloto consultar durante uma conversa.
7. Expirar ou sinalizar conteúdo antigo e manter histórico de atualizações.

Fontes candidatas a avaliar antes da ativação:

- Banco Central do Brasil;
- CVM;
- Tesouro Nacional;
- Receita Federal;
- IBGE;
- gov.br e outras instituições públicas com conteúdo relevante.

A lista final depende da disponibilidade de feeds/APIs, licença, termos de uso, frequência de atualização e qualidade editorial. Não coletar conteúdo atrás de login, paywall ou controles de acesso; não copiar artigos integralmente. Guardar metadados, links e sínteses concisas quando a licença permitir.

## 3. Uso da biblioteca nas conversas

Quando consultar conhecimento externo, o Copiloto deve:

- priorizar fontes oficiais e atuais;
- verificar a data de publicação e a data da última atualização;
- apresentar a fonte ao usuário;
- diferenciar regra vigente, orientação educativa e informação histórica;
- declarar quando não encontrou dado atual suficiente;
- nunca inventar taxas, limites, regras, datas ou números;
- não executar ações financeiras nem alterar lançamentos por conta própria.

O sistema deve usar recuperação contextual (RAG) sobre conteúdo validado. Não basta guardar textos: é necessário selecionar os trechos relevantes e devolver a referência de origem.

## 4. Ciclo de qualidade

Cada evolução precisa passar por um ciclo controlado:

- coletar feedback explícito;
- agrupar erros e dúvidas recorrentes sem expor identidades;
- propor uma alteração de conteúdo, recuperação ou prompt;
- executar testes de regressão com casos reais anonimizados ou casos sintéticos;
- revisar segurança, privacidade e precisão;
- versionar e publicar a alteração;
- observar métricas e permitir rollback.

O sistema não deve editar seu próprio código, permissões, cálculos ou políticas de segurança. Aprender significa melhorar contexto, preferências e recuperação de conhecimento sob regras controladas.

## 5. Segurança, privacidade e operação

Antes de ativar:

- atualizar Política de Privacidade e Termos com finalidade, fontes, retenção e fornecedores de IA;
- obter consentimento claro para memória personalizada e explicar como desligá-la;
- definir retenção mínima e exclusão dos dados pessoais;
- proteger tarefas agendadas e endpoints com autenticação de serviço, limites e logs sem segredos;
- armazenar chaves apenas em secrets do backend;
- validar RLS e testes de isolamento entre usuários e famílias;
- aplicar limites de custo e frequência à coleta;
- monitorar falhas, fontes indisponíveis e conteúdos vencidos.

O aprendizado e a atualização de conteúdo não devem depender de coletar dados privados de outros clientes. A biblioteca pública pode ser compartilhada entre usuários; a memória personalizada, não.

## 6. Ordem de implementação

1. Auditar a arquitetura atual de IA, histórico e privacidade. No estado atual, a Política de Privacidade informa que o recurso de IA está desativado; não anunciar aprendizado ativo antes da integração real.
2. Definir provedor de IA, custos, limites e tratamento de dados.
3. Implementar memória estruturada por usuário/família, controles e RLS.
4. Implementar catálogo de fontes e coleta agendada no backend.
5. Implementar deduplicação, validade, indexação e recuperação RAG.
6. Integrar o assistente ao app e ao Tamanduá, com citações e feedback.
7. Executar testes de segurança, precisão, privacidade, custo e regressão antes de liberar.

## 7. Durante o piloto

- Testadores internos continuam com acesso gratuito, sem paywall, seleção de plano ou cobrança.
- O fluxo de apresentação e questionário do Tamanduá é obrigatório antes de entrar no workspace.
- Não habilitar uma coleta de conversas para treinamento compartilhado durante o piloto.
- Qualquer memória personalizada ou uso de IA deve ser transparente, minimizado e testável.
