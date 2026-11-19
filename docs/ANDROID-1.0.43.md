# Android 1.0.43 — entrada, rolagem e referências visuais

- O servidor registrava `permission denied for table internal_testers`. A função
  `is_internal_tester` é SECURITY INVOKER, mas não havia SELECT para authenticated.
  A migração restaura somente SELECT(email, acesso_ate), mantendo a política RLS
  que limita a leitura ao e-mail do próprio JWT. Observações e escritas continuam
  bloqueadas. Migração aplicada no projeto existente; nenhum cadastro foi alterado.
- A recuperação de entrada restaura a sessão antes de tentar novamente, oferece
  nova autenticação local e apresenta um código seguro de suporte, sem exigir
  Console de um usuário de celular.
- A rolagem da página usa um único contêiner vertical. O personagem embutido aceita
  gesto vertical e zoom nativo, mantendo rotação horizontal. O visualizador ampliado
  mantém os próprios controles 3D.
- A reconstrução mede todas as seções antes de escrever estilos, evita poses
  repetidas e dispensa clip-path animado no celular. Desfoque de página removido
  no celular; cores, conteúdo e recursos permanecem.
- Referências observadas no Instagram: Dd3vJWiKIQr (barra líquida e seleção circular
  cobre) e DYkQiVMtpuz (preto, marfim, cobre e azul, transições de partículas).
  Implementação original adaptada às finanças: navegação líquida, escultura de
  partículas e reconstrução do conteúdo. Não é reprodução exata quadro a quadro.
  A escultura possui 560 pontos, DPR máximo 2 e nenhum loop permanente.
- O chat mantém o Tamanduá e o tema cacau; a barra e a apresentação usam a nova
  referência. Nenhum arquivo da web pública, CMS ou Workers foi alterado.

Verificações: testes Node, parser de scripts/ativos Android, teste PostgreSQL com
dados fictícios que reproduz a falha e verifica isolamento, além da compilação e
assinatura em CI. Prévia no navegador não substitui teste físico de toque,
desempenho e autenticação na versão distribuída pela Google Play.

Pacote: br.com.copiloto.financeiro; versionName 1.0.43; versionCode 43.
Build interno mantém compras bloqueadas e não publica automaticamente na Play.
