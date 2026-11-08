# Camada de Inteligência do Copiloto Financeiro

## Objetivo

O Tamanduá é a interface/personagem da inteligência do Copiloto. A memória adaptativa não fica no dispositivo: ela é persistida no Supabase e vinculada ao usuário e à família.

## Camadas

- `ia_conhecimento`: conhecimento global validado, com fonte, versão, confiança, tags e status.
- `ia_aprendizados`: preferências e sinais adaptativos individuais/familiares.
- `ia_eventos`: eventos estruturados de uso da inteligência para acompanhar evolução sem guardar segredos financeiros.
- `ia_feedback`: avaliações explícitas das respostas.
- `conversas_ia` e `mensagens_ia`: histórico de conversas já existente no produto.

## Segurança

Todas as tabelas da camada possuem RLS.

Aprendizados, eventos e feedback são vinculados a `auth.uid()` e a uma família da qual o usuário participa. O conhecimento global pode ser lido por usuários autenticados somente quando está ativo.

O aplicativo não usa `localStorage` como banco de memória do Tamanduá. O dispositivo mantém apenas o estado técnico de conclusão da introdução. As preferências do Tamanduá são persistidas em `ia_aprendizados`.

## Evolução

A inteligência pode acumular sinais estruturados e feedback ao longo do tempo. Isso não significa modificar silenciosamente código, regras financeiras ou permissões. Essas áreas permanecem determinísticas, testadas e revisáveis.

O conhecimento global deve ser alimentado por fontes confiáveis e versionado antes de ser considerado válido para recuperação contextual.

## Estado atual

A camada de dados foi criada e aplicada ao Supabase de produção. Os dez registros existentes da tabela legada `conhecimento` foram inicializados em `ia_conhecimento`.

A integração Android da versão 1.0.27 passa a salvar e carregar o perfil adaptativo do Tamanduá pelo banco compartilhado, mantendo o isolamento por usuário/família.

Ainda não se deve afirmar que o modelo de IA está sendo retreinado a cada conversa. O que está ativo nesta etapa é a infraestrutura de memória/adaptação persistente. A próxima etapa é conectar o motor generativo a essa camada com recuperação contextual e avaliação das respostas.
