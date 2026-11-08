## 1.0.36 — código 36

- Nova versão Android preparada para teste interno na Google Play.
- Testadores internos continuam com acesso de avaliação sem exigir pagamento ou assinatura.
- Mantida a integração Google Play Billing para o fluxo de produção; o teste interno não depende de compra.
- Mantidas as melhorias de voz multilíngue do Tamanduá da versão 1.0.35.

## 1.0.7 — Performance pass

- Preserved the original canvas particle/curve density and animation cadence.
- Added strict canvas containment to isolate rendering work.
- Removed unnecessary character-data observation from the app MutationObserver.
- Throttled desktop card tilt calculations to animation frames to reduce layout work.

# Histórico de versões Android

## 1.0.4 — código 5

- Novo ambiente de motion design imersivo em todo o aplicativo Android.
- Cena 2.5D com câmera suave, perspectiva e camadas de profundidade.
- Órbitas, trilhas de luz, partículas e imagem de cenário com movimento contínuo.
- Ondas visuais de toque e mudança de acento conforme a área financeira aberta.
- Cena suspensa quando o aplicativo fica em segundo plano.
- Respeito à preferência do sistema para reduzir movimento.
- Mantém navegação financeira, autenticação, sincronização Supabase e integração Google Play Billing.
- A vitrine web pública permanece inalterada.

## 1.0.3 — código 4

- Atualização visual premium e refinamento da interface empacotada no Android.
- Primeira camada de movimento de fundo e imagem incorporada.
- Acesso controlado para testadores internos.

## 1.0.5 — Motion Design and navigation polish

- Added scroll-triggered diagonal reveal for financial cards and sections.
- Added restrained 3D depth, pointer tilt and light response on desktop-capable surfaces.
- Added a morphing liquid ambient layer and frosted-glass plan/pricing surfaces.
- Added a user-initiated, muted 6-second MP4 preview in an expandable dialog; playback stops on close, back navigation, app backgrounding and reduced-motion preference.
- Bundled the privacy, terms and account-deletion pages in the current Android package so these links work inside the app.
- Kept the public marketing site separate from the Android finance experience.
- Preserved the existing Supabase, RLS and Google Play Billing flows.

## 1.0.6 — WebView hardening, privacy and tester clarity

- Updated the Supabase JavaScript SDK to 2.119.0 and pinned the integrity of all external script dependencies with Subresource Integrity.
- Replaced the legacy JavaScript interface with an origin- and main-frame-checked WebMessageListener for Google Play billing commands.
- Restricted internal WebView navigation to the exact HTTPS app-assets origin; external navigation now requires HTTPS.
- Disabled WebView cookies because the Android app uses Supabase local storage for its session and does not rely on cookies.
- Disabled automatic URL-based session detection and made ordinary sign-out local to the current device.
- Added a visible internal-test banner explaining that evaluation access is already granted and no purchase is required during this phase.
