# Auditoria de segurança e privacidade — 2026-11-07

## Escopo

Revisão do Android/WebView, cliente web empacotado, políticas Supabase e superfícies de autenticação/autorização.

Referências de base: OWASP MASVS/MASTG para o cliente móvel e OWASP ASVS para os endpoints remotos.

## Controles verificados

- WebView usa `WebViewAssetLoader` em origem HTTPS própria do app.
- `allowFileAccess`, `allowContentAccess`, `allowFileAccessFromFileURLs` e `allowUniversalAccessFromFileURLs` permanecem desativados.
- Cleartext traffic está desativado no Android Manifest.
- Cookies de WebView e cookies de terceiros estão desativados.
- Navegação externa é controlada por allowlist/origem confiável e aberta fora do WebView privilegiado.
- Safe Browsing permanece habilitado.
- WebView debugging fica condicionado a `BuildConfig.DEBUG`.
- `FLAG_SECURE` protege a tela financeira contra captura de tela/saída para displays não seguros.
- A ponte de cobrança usa Web Message Listener e valida a origem antes de processar comandos.
- O cliente não contém `service_role`.
- Política de Privacidade, Termos de Uso e Exclusão de Conta estão empacotados no Android.
- `internal_testers` agora possui RLS com leitura apenas da própria linha autenticada.
- `is_internal_tester()` agora é `SECURITY INVOKER`, com `search_path` explícito e execução concedida somente a `authenticated`.
- As views financeiras auditadas anteriormente continuam com `security_invoker=true`.

## Resultado da verificação Supabase

Após aplicar a migration `20261107190000_harden_internal_tester_security`, o Security Advisor deixou de reportar:

- RLS habilitado sem policy em `internal_testers`;
- função `SECURITY DEFINER` executável por `authenticated`.

Permanece um aviso de configuração externa:

- Leaked Password Protection do Supabase Auth está desabilitado.

Essa última medida depende da configuração do Auth e não deve ser simulada no código do cliente.

## Próxima bateria

1. Habilitar Leaked Password Protection no Supabase Auth.
2. Validar headers HTTP do Cloudflare Worker de produção: CSP, HSTS, X-Content-Type-Options, Referrer-Policy e proteção contra framing.
3. Executar testes controlados de isolamento entre famílias e funções privilegiadas.
4. Fazer revisão de XSS com dados de descrição/categoria/importação.
5. Revalidar o AAB assinado e os Android Vitals antes do release.

## Princípio

O cliente móvel deve permanecer rápido e simples, mas qualquer controle de autorização deve continuar sendo imposto no backend. O Tamanduá e os recursos de inteligência do app apenas interpretam dados já autorizados; não recebem privilégios adicionais.
