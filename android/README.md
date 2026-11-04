# Copiloto Financeiro para Android

Projeto Android nativo com WebView restrita aos arquivos locais e integração Google Play Billing.

- Application ID: com.gustavosena.copilotofinanceiro
- Min SDK: 24
- Target SDK: 35
- Java: 17
- Google Play Billing Library: 7.1.1

O workflow .github/workflows/android.yml gera APK de depuração e AAB de release. O AAB de release ainda precisa ser assinado com a chave de upload oficial antes de ser enviado ao Play Console. Não armazene keystores ou senhas no repositório.

As compras são verificadas no servidor Supabase; credenciais de serviço Google Play nunca são distribuídas no cliente Android.
