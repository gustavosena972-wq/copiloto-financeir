# Evolução contínua do Copiloto Financeiro

**Status:** requisito de produto definido; a implementação de inteligência adaptativa e ingestão automática ainda não está ativada.

## Objetivo

O Copiloto Financeiro deve evoluir continuamente com o uso e com o estudo de fontes financeiras e pesquisas. Não haverá um limite artificial de assuntos, categorias, quantidade de fontes elegíveis ou ciclos de melhoria. A biblioteca deve crescer conforme novas fontes confiáveis e conteúdos relevantes forem descobertos. A evolução será contínua, mensurável e auditável. Os limites necessários são de segurança, privacidade, direitos de uso, qualidade das fontes e capacidade operacional — não uma lista fechada de temas.

## 1. Aprendizado com as conversas

A evolução individual deve usar memória estruturada e controlada, não retreinamento automático do modelo a cada mensagem.

Sinais permitidos, após informar o usuário e obter a escolha de privacidade necessária:

- preferências de explicação: mais simples, passo a passo ou mais detalhada;
- perguntas e temas recorrentes, convertidos em sinais mínimos de interesse, sem transformar automaticamente conversas privadas em treinamento compartilhado;
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

## 2. Estudo contínuo de fontes, pesquisas e publicações

O Copiloto deve aprender sobre finanças em um universo expansível de assuntos. A lista de temas não será fixa: educação financeira, orçamento familiar, crédito, juros, inflação, endividamento, impostos, investimentos, aposentadoria, proteção contra golpes, economia, indicadores e novos assuntos relevantes que surjam.

A ingestão deve combinar:

- fontes oficiais e regulatórias: Banco Central, CVM, Tesouro Nacional, Receita Federal, IBGE, gov.br e órgãos equivalentes;
- estudos e pesquisas acadêmicas publicados por universidades, centros de pesquisa, periódicos científicos e instituições de ensino;
- relatórios técnicos e estatísticos de organizações reconhecidas;
- materiais educativos de instituições financeiras e entidades com metodologia e autoria identificáveis;
- fontes adicionais que passem por avaliação de confiabilidade, transparência e permissões de uso.

Estudos ainda não revisados por pares podem ser considerados, mas devem ser identificados como preprints ou documentos preliminares; não devem ser tratados como consenso científico. Conteúdo comercial, opinião e publicidade precisam ser classificados separadamente de evidência técnica.

Cada item deve guardar origem, autor/instituição, título, URL, data de publicação, data de coleta, data de atualização, área de conhecimento, tipo de documento, versão, licença/termos de uso, status de revisão e nível de confiança. Quando existir DOI ou identificador oficial, também deve ser registrado.

## 3. Biblioteca financeira atualizada em segundo plano

Quando o aplicativo não estiver sendo usado, a coleta e o processamento continuam no backend por tarefas agendadas e filas. O celular não precisa ficar aberto ou executando processos em segundo plano. Não haverá um teto fixo de assuntos ou um número arbitrário de ciclos de estudo: o agendamento será contínuo e adaptativo à relevância, à atualização das fontes, à capacidade operacional e aos limites publicados por cada fonte.

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

## 4. Uso da biblioteca nas conversas

Quando consultar conhecimento externo, o Copiloto deve:

- priorizar fontes oficiais e atuais;
- verificar a data de publicação e a data da última atualização;
- apresentar a fonte ao usuário;
- diferenciar regra vigente, orientação educativa e informação histórica;
- declarar quando não encontrou dado atual suficiente;
- nunca inventar taxas, limites, regras, datas ou números;
- não executar ações financeiras nem alterar lançamentos por conta própria.

O sistema deve usar recuperação contextual (RAG) sobre conteúdo validado. Não basta guardar textos: é necessário selecionar os trechos relevantes e devolver a referência de origem.

## 5. Ciclo de autoaperfeiçoamento

Cada evolução de conhecimento e personalização deve poder ocorrer automaticamente dentro das regras já aprovadas. O sistema pode descobrir temas, buscar estudos, deduplicar documentos, recalcular embeddings, atualizar o índice, melhorar a recuperação e usar feedback consentido para ajustar preferências. Isso não deve depender de uma publicação manual a cada novo artigo.

Cada alteração de comportamento que afete respostas precisa passar por avaliações automáticas contínuas:

- coletar feedback explícito;
- agrupar erros e dúvidas recorrentes sem expor identidades;
- propor uma alteração de conteúdo, recuperação ou prompt;
- executar testes de regressão com casos reais anonimizados ou casos sintéticos;
- revisar segurança, privacidade e precisão;
- versionar e publicar a alteração;
- observar métricas e permitir rollback.

O sistema pode autoatualizar sua biblioteca, os índices de busca, a priorização de fontes e as memórias individuais autorizadas. Não pode reescrever silenciosamente o próprio código, conceder privilégios, alterar cálculos de saldos, mudar regras financeiras, remover controles de segurança ou publicar mudanças críticas sem revisão e testes. Assim, a evolução de conhecimento é contínua e automática; as mudanças de alto impacto permanecem verificáveis e reversíveis.

## 6. Segurança, privacidade e operação

Antes de ativar:

- atualizar Política de Privacidade e Termos com finalidade, fontes, retenção e fornecedores de IA;
- obter consentimento claro para memória personalizada e explicar como desligá-la;
- definir retenção mínima e exclusão dos dados pessoais;
- proteger tarefas agendadas e endpoints com autenticação de serviço, limites e logs sem segredos;
- armazenar chaves apenas em secrets do backend;
- validar RLS e testes de isolamento entre usuários e famílias;
- aplicar cotas operacionais, limites de requisição de cada fonte, controle de custo e filas elásticas; essas cotas protegem a operação e não limitam artificialmente os temas que o Copiloto pode estudar;
- monitorar falhas, fontes indisponíveis e conteúdos vencidos.

O aprendizado e a atualização de conteúdo não devem depender de coletar dados privados de outros clientes. A biblioteca pública pode ser compartilhada entre usuários; a memória personalizada, não.

## 7. Ordem de implementação

1. Auditar a arquitetura atual de IA, histórico e privacidade. No estado atual, a Política de Privacidade informa que o recurso de IA está desativado; não anunciar aprendizado ativo antes da integração real.
2. Definir provedor de IA, custos, limites e tratamento de dados.
3. Implementar memória estruturada por usuário/família, controles e RLS.
4. Implementar catálogo de fontes e coleta agendada no backend.
5. Implementar deduplicação, validade, indexação e recuperação RAG.
6. Integrar o assistente ao app e ao Tamanduá, com citações e feedback.
7. Executar testes de segurança, precisão, privacidade, custo e regressão antes de liberar.

## 8. Durante o piloto

- Testadores internos continuam com acesso gratuito, sem paywall, seleção de plano ou cobrança.
- O fluxo de apresentação e questionário do Tamanduá é obrigatório antes de entrar no workspace.
- Não habilitar uma coleta de conversas para treinamento compartilhado durante o piloto.
- Qualquer memória personalizada ou uso de IA deve ser transparente, minimizado e testável.
