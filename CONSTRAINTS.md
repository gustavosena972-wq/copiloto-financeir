# Copiloto Financeiro — Quality and Release Constraints

These rules apply to the Web app, Android wrapper, Supabase database and Edge Functions.

## Non-negotiable safety rules

- Never place Supabase service-role keys, Google service-account private keys, keystores, passwords, purchase tokens or user access tokens in source code, HTML, logs or committed test fixtures.
- Browser and Android clients may use only the public Supabase publishable/anon key. Authorization must be enforced by RLS, database functions or server-side Edge Functions.
- Every table in an exposed schema must have RLS. Views exposed to clients must use security_invoker=true unless a reviewed exception exists.
- Every SECURITY DEFINER function must use a fixed trusted search_path with pg_temp explicitly last, and must enforce the caller's identity/authorization in the function body.
- CORS must use explicit origins. Never use wildcard CORS for authenticated or sensitive endpoints.
- Validate untrusted input at boundaries; request bodies for the auth and Google Play Edge Functions are capped at 8 KiB.
- Payment access is granted only after server-side Google Play verification and an authorized administrative decision. Client state and client-supplied prices are never authoritative.
- Destructive database changes, migrations, deployments, production secrets and Play Console releases require explicit human authorization and a rollback plan.

## Canonical application surfaces

- Web source of truth: index.html (Cloudflare Worker origin).
- Android release module: android-app/.
- Supabase source of truth: supabase/migrations/, supabase/functions/ and supabase/tests/.
- The legacy android/ module and old Billing bridge files are not the release path. Do not delete them until the Play Console package ID and any remaining references are confirmed.

## Required checks for code changes

Run the focused checks relevant to the changed area:

| Area | Required check |
|---|---|
| Web / Android bridge contract | node scripts/check-android-release-contract.mjs |
| Shared Edge Function input parser | deno test supabase/functions/_shared/security.test.ts |
| Auth Edge Function | deno check supabase/functions/autenticacao-usuario/index.ts |
| Google Play purchase Edge Function | deno check supabase/functions/google-play-purchase/index.ts |
| Google Play admin Edge Function | deno check supabase/functions/google-play-admin/index.ts |
| Android compile / bundle | gradle assembleDebug and gradle bundleRelease from android-app/ |
| Database migrations | Apply to an isolated Supabase/Postgres test database first; run the matching SQL regression tests; never validate destructive DDL by committing it to production and hoping for the best. |

The Android/Web contract check currently verifies all 70 statically declared data-act actions have a handler, plus the authentication callback, configuration grants, CSP, secret exposure, Android Manifest, WebView and Billing release contracts.

## Release gates

A release is not approved until all applicable checks pass:

1. GitHub CI is green on the exact PR head commit.
2. The Cloudflare build/preview succeeds and the deployed Worker serves the expected commit.
3. Database migrations pass in an isolated environment and are applied only with approval.
4. Supabase Edge Functions are deployed and their configured secrets are verified without exposing values.
5. Android produces a signed AAB using protected CI secrets; verify the signature.
6. Test on a physical Android device: signup/login/recovery, family isolation, financial CRUD, import/export, realtime updates, purchase/pending/restore, admin approval and refund.
7. Web flows are tested in a real browser at desktop and mobile widths, with console/network checks and keyboard/accessibility review.
8. Privacy policy, terms, support contact, package ID and Play Console prices match the actual service.

## Current measured gaps

- Browser and physical-device end-to-end suites are not yet connected to CI.
- Accessibility and Core Web Vitals are not yet measured against a successful preview URL.
- Secret/dependency scanning is not yet a required CI gate.
- A signed production AAB and real Google Play test purchase have not yet been verified.

Do not claim a gate is satisfied unless its check ran against the current commit or environment.
