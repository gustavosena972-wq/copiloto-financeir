# Android 1.0.47 — acesso ao teste e Tamanduá

O cadastro por usuário cria um e-mail técnico de autenticação. A comparação exclusiva com a lista de Gmail rejeitava esses novos usuários, embora o modo gratuito do servidor já estivesse ligado. A função `is_internal_tester()` agora acompanha esse modo para contas autenticadas não anônimas; com o modo desligado, volta à lista explícita com prazo. Nenhuma identidade é inferida de campos editáveis pelo usuário.

A migração `20261110174945_align_username_test_mode.sql` foi aplicada e a verificação transacional no servidor retornou acesso verdadeiro para uma conta de usuário existente. Ela concede somente a execução do leitor booleano existente da configuração privada; não permite ler/alterar a tabela de flags. O modo gratuito é global no servidor: a lista de Gmail não restringe individualmente contas registradas enquanto esse modo estiver ativo. A distribuição de teste pela Google Play continua separada.

O retrato aprovado dos planos permanece no fundo do chat. O novo controle com o rosto abre a configuração opcional e, para perfil configurado, dá acesso às tarefas existentes. O toque reage com uma breve reconstrução respeitando redução de movimento. O fundo não captura gestos de rolagem e nenhum microfone é ativado por esse controle.

Validação local: 62 testes Node Android, verificação dos assets e 21 resultados PostgreSQL (incluindo os testes de Checape e 11 cenários novos de acesso). Os novos testes reproduzem a recusa anterior, isolamento entre famílias, bloqueio anônimo, prazo, desligamento do modo e tentativa de falsificar metadados. Prévia com dados fictícios conferida em largura de celular e tela ampla; toque abre a configuração.

Pacote interno 1.0.47 / código 47, compras nativas bloqueadas. A compilação assinada e seus checks ficam no GitHub Actions. Nenhum envio à Play, merge ou alteração da web pública. A confirmação final em celular físico (login, voz, tarefas autenticadas) continua necessária.
