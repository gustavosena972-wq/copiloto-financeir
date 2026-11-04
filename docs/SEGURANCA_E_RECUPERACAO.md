# Segurança e recuperação — Copiloto Financeiro

Última revisão: 04/11/2026

Este documento registra controles confirmados, alterações aplicadas e tarefas operacionais que ainda dependem de configuração no painel ou de credenciais que não devem ser armazenadas no repositório.

## Alterações aplicadas nesta revisão

- Removidos privilégios PostgreSQL desnecessários de `TRUNCATE`, `REFERENCES` e `TRIGGER` para os papéis `anon` e `authenticated` em tabelas do schema `public`.
- Aplicada a mesma restrição como privilégio padrão para novas tabelas criadas pelo papel `postgres` no schema `public`.
- Criados índices para as três chaves estrangeiras de `public.google_play_compras`.
- Criadas políticas explícitas de negação para os papéis de cliente nas tabelas internas `google_play_compras`, `login_recuperacao` e `login_usuarios`. O acesso administrativo continua reservado às Edge Functions com `service_role`.
- O papel PostgreSQL `anon` agora possui somente leitura em `public.config_app`; todos os demais privilégios de tabela, view e sequência foram revogados. A mesma regra foi aplicada aos privilégios padrão de novos objetos.
- Confirmado que as dez views públicas usam `security_invoker=true`, fazendo com que respeitem as permissões e políticas RLS do chamador.
- A Edge Function `google-play-purchase` recebeu limite de corpo de 8 KiB, validação estrita dos tipos de entrada, limite de tentativas por usuário e IP, verificação do identificador Android esperado e rejeição de origens web não autorizadas.
- A função de compra continua exigindo JWT válido (`verify_jwt=true`); segredos de serviço não são enviados ao cliente.

## Acesso do usuário não autenticado

Após a migração `restrict_anon_database_access_to_public_config`, foi feita uma consulta de verificação de privilégios. O único objeto do schema `public` no qual o papel `anon` mantém privilégio é:

| Objeto | Acesso anônimo |
|---|---|
| `public.config_app` | `SELECT` (somente leitura) |

Não há privilégios anônimos de `INSERT`, `UPDATE` ou `DELETE` nesse objeto. O papel `anon` não possui privilégios de leitura ou escrita nas demais tabelas, views e sequências do schema `public`.

A tabela `config_app` contém chaves de configuração destinadas à exibição pública do aplicativo, incluindo informações de contato e instruções de pagamento. Não armazene nela segredos, tokens, senhas ou credenciais privadas.

As funções RPC verificadas não concedem execução ao papel `anon`. As tabelas de dados financeiros usam políticas RLS baseadas em `auth.uid()` e nas funções de vínculo à família; o usuário não autenticado não satisfaz essas condições. As tabelas internas `admins`, `google_play_compras`, `login_recuperacao` e `login_usuarios` também possuem políticas explícitas de negação aos papéis de cliente.

Esta verificação cobre os privilégios PostgreSQL do schema `public`; não significa que as páginas estáticas públicas do site deixem de ser acessíveis.

## Endpoints públicos de autenticação

A Edge Function `autenticacao-usuario` está publicada com `verify_jwt=false` intencionalmente, pois precisa receber solicitações antes do login. Ela aceita somente POST e as ações `login`, `signup` e `recover`; valida nome de usuário e senha, exige aceite dos termos no cadastro, aplica limite de tentativas por identificador e IP e usa a chave `service_role` apenas no servidor. A função não concede acesso direto às tabelas internas ao cliente. O limite atual é 12 tentativas por usuário e 600 por IP em 10 minutos.

CORS restringe navegadores ao domínio publicado, mas não impede chamadas HTTP feitas por clientes externos; a proteção efetiva depende das validações e limites implementados no endpoint. As outras funções listadas — `copiloto-ia`, `google-play-purchase` e `google-play-admin` — exigem JWT válido (`verify_jwt=true`).

## Estado dos controles

| Controle | Situação |
|---|---|
| HTTPS nas APIs | Utilizado pelas APIs Supabase e Google Play |
| Senhas | Gerenciadas pelo Supabase Auth; não implementar hash próprio |
| MFA da conta administrativa | Ativar/verificar manualmente na conta Supabase e GitHub |
| MFA dos usuários do app | Não implementado no fluxo atual |
| Rate limit | Login e compra protegidos; revisar novos endpoints ao adicioná-los |
| Validação de entrada | Reforçada nas funções de autenticação e compra; revisar formulários do frontend |
| SQL injection | Consultas Supabase usam parâmetros; revisar qualquer SQL dinâmico novo |
| RLS | Ativado nas tabelas públicas; tabelas internas possuem negação explícita aos papéis de cliente |
| Sessões | Rever no painel Supabase os tempos de expiração, refresh token e inatividade |
| Secrets | Manter service role, conta Google Play e senhas apenas em secrets/variáveis do servidor |
| CORS | Autenticação limitada ao domínio publicado; compra permite GitHub Pages e origem `null` do WebView local, rejeitando outras origens |
| Logs | Logs Supabase disponíveis; não registrar tokens de compra, senhas ou dados financeiros |
| Criptografia | TLS em trânsito e criptografia de armazenamento fornecida pela plataforma |
| Dependências | Executar auditoria periódica e manter versões fixadas |
| Migrações | Três migrações desta revisão estão em `supabase/migrations`; o histórico anterior do banco ainda precisa ser reconstruído no repositório |
| Rollback | Não executar rollback automático em produção; preferir migração corretiva reversível e backup verificado |
| PITR | Não habilitado por custo |
| Backup externo | Workflow criado; depende da configuração de dois secrets do GitHub |
| Recuperação | Teste de restauração ainda pendente |

## Backup externo sem PITR

O workflow `.github/workflows/database-backup.yml` cria um dump semanal do PostgreSQL, criptografa o arquivo com AES-256 e publica o artefato criptografado no GitHub Actions por 30 dias.

Configure no repositório, em **Settings → Secrets and variables → Actions**, os seguintes secrets:

- `SUPABASE_DB_URL`: string de conexão PostgreSQL do projeto, com SSL obrigatório (`sslmode=require`). Use uma credencial de banco apropriada e nunca a publique.
- `BACKUP_PASSPHRASE`: frase-senha longa e aleatória, guardada fora do repositório. Não reutilize a senha do banco.

Depois, execute o workflow manualmente uma vez e confirme que o artefato criptografado foi criado. Sem esses secrets, nenhum backup será gerado.

**Limitação:** artefatos do GitHub Actions não substituem uma cópia externa de longo prazo. Baixe periodicamente o artefato criptografado para armazenamento separado e protegido. Guarde a frase-senha em local seguro, separado do backup.

## Procedimento de recuperação

1. Interromper temporariamente alterações no aplicativo se houver suspeita de corrupção.
2. Preservar o dump criptografado mais recente e identificar a data/hora.
3. Recuperar a frase-senha por meio do responsável autorizado.
4. Restaurar primeiro em um projeto Supabase isolado, nunca diretamente em produção.
5. Validar tabelas, políticas RLS, funções, extensões, usuários e integridade dos dados.
6. Executar testes de login, família, lançamentos, exportação, recuperação de conta e compras.
7. Somente após aprovação, planejar a restauração de produção.
8. Registrar incidente, causa, ponto de recuperação e ações preventivas.

Este procedimento ainda precisa de um teste real de restauração antes de ser considerado validado.

## Itens manuais que permanecem

- Ativar MFA para contas administrativas Supabase e GitHub.
- Habilitar proteção contra senhas vazadas no Supabase Auth, quando disponível no plano/configuração contratada.
- Conferir SSL enforcement e restrições de rede do banco no painel.
- Definir expiração de sessão e política de refresh compatíveis com o aplicativo.
- Configurar os secrets de backup e executar o primeiro backup.
- Fazer teste de restauração em ambiente isolado.
- Revisar o uso de `innerHTML` no frontend e validar toda interpolação de conteúdo fornecido por usuários.
- Reconstituir no GitHub as migrações históricas que já estão aplicadas no banco, para que novos ambientes possam ser reproduzidos.

## Regra operacional

Nunca versionar chaves `service_role`, credenciais de banco, JSON de conta de serviço Google, keystore Android ou senhas. Utilizar secrets do Supabase/GitHub Actions e revisar permissões antes de qualquer alteração de produção.
