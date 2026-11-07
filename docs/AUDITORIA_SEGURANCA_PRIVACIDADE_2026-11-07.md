# Auditoria de segurança e privacidade — Copiloto Financeiro

Data da revisão: 2026-11-07

## Escopo

Revisão do aplicativo Android/Web, Supabase Auth, RLS, funções RPC/Edge Functions e páginas públicas de privacidade/conta.

## Resultado

O projeto já possui uma camada de segurança acima de um protótipo comum: RLS está habilitado nas tabelas públicas, as views financeiras usam `security_invoker`, tabelas internas de login e compras Google Play têm bloqueio explícito para clientes e as Edge Functions usam allowlist de origens.

A revisão encontrou três pontos que precisam de tratamento:

1. **`public.is_internal_tester()` usava SECURITY DEFINER e era executável por usuários autenticados.** A função só retorna um booleano, mas o desenho pode ser simplificado e endurecido. A migração `20261107190000_harden_internal_tester_security.sql` transforma a função em SECURITY INVOKER e cria RLS para que cada usuário só consiga consultar a própria linha.
2. **Proteção contra senhas vazadas do Supabase Auth está desativada.** Isso deve ser habilitado no painel do Supabase. O código não deve tentar reproduzir essa proteção localmente.
3. **Cabeçalhos de segurança HTTP do site não estão presentes no repositório.** Como o domínio de produção é servido por Cloudflare Workers, CSP, HSTS, X-Content-Type-Options, Referrer-Policy e frame protection precisam ser configurados na camada que entrega o site. Não é seguro afirmar que estão presentes sem inspecionar o Worker em produção.

## Controles já verificados

- RLS habilitado nas tabelas públicas do banco.
- Views públicas financeiras configuradas com `security_invoker=true`.
- Acesso de cliente explicitamente negado para `admins`, `google_play_compras`, `login_usuarios` e `login_recuperacao`.
- Chaves de serviço aparecem apenas como variáveis de ambiente nas Edge Functions; nenhuma `service_role` foi encontrada hardcoded no repositório.
- As Edge Functions de autenticação e Google Play mantêm allowlist explícita de origens.
- O aplicativo possui páginas locais de Política de Privacidade, Termos de Uso e Exclusão de Conta.
- O fluxo de cadastro registra a versão dos termos aceita.
- O aplicativo Android desativa cleartext traffic.

## Pontos que continuam exigindo teste de penetração controlado

- autorização horizontal: usuário A tentando acessar família/dados do usuário B;
- autorização vertical: editor/leitor tentando executar ações de dono/admin;
- XSS em descrições, nomes, categorias e dados importados;
- abuso de RPCs e limites de autenticação;
- expiração/revogação de sessões;
- configuração HTTP real do domínio de produção;
- dependências externas e integridade de scripts carregados no navegador.

A metodologia segue as categorias do OWASP Web Security Testing Guide: descoberta de superfície, autenticação, autorização, armazenamento no cliente, injeção e vazamento de informações. 
