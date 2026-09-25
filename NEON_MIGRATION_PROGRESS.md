# Neon-only migration progress

Last updated: 2026-09-23

## Current phase

Phase 2 — Server API boundary for user data (account/cart/wishlist slice implemented; SQL/deployment pending)

## Completed

- Neon `main` and `dev-supabase-migration` contain the baseline schema.
- Both branches have the canonical root categories and zero products.
- Product/category APIs and root-only product creation are implemented.
- The repository is linked to Vercel project `sourcesevens`.
- `npm run test:product-categories` passes 8/8.
- The implementation agent verified `npm run build` with only the existing bundle and dynamic-import warnings.
- Current source inventory confirms the remaining Supabase runtime responsibilities: auth, account data, carts, wishlists, orders, reviews, settings, image storage, payments, notifications, and admin users.

## Phase 1 implementation update — Neon Auth wiring

Neon Auth is selected and the application code now has a Neon Auth path while retaining Supabase as a temporary fallback for data services. Neon Auth itself takes precedence when `VITE_NEON_AUTH_URL` is present.

- Added the Neon Auth browser client, account creation, sign-in/out, session checks, password-reset request/update, and bearer token retrieval.
- Added server-side JWT verification for Neon-authenticated API requests and admin status lookup.
- Added `neon/migrations/0004_neon_auth_profile_mapping.sql` to link Neon Auth IDs to the app's UUID-keyed `user_profiles` records.
- Added the required environment variable names to `.env.example`; no credentials or actual project URLs are stored there.
- Removed mock account creation/sign-in/reset success paths so missing configuration is reported instead of pretending an account exists.
- Build passes. TypeScript's whole-project check still reports existing unrelated errors in UI imports, app routing, checkout typing, and Deno functions; the auth-specific changed files produced no matching type errors.

The Neon Auth code and profile mapping were deployed/configured after this note was first drafted. Continue to treat production flows as unverified until the current live deployment is smoke-tested.

## Setup confirmed by project owner

- Neon Auth is enabled on Neon `main`.
- The production domain is already in Neon Auth trusted domains.
- Vercel `VITE_NEON_AUTH_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_JWKS_URL` are configured for the project.
- The profile-mapping migration ran successfully on `main`/`neondb`. A read-only verification query confirmed the mapping column, unique index, trigger function, and auth-user trigger exist.
- The Neon Auth wiring has been deployed; the account-data API changes below still need a deployment and live smoke test.

Remaining migration-wide infrastructure work includes confirming Preview settings/branch, the restricted runtime role and pooled `DATABASE_URL`, and choosing image storage.

## Latest verification

- Neon `main` contains the PostgreSQL role `app_runtime_user` with password authentication. The role exists on `main`; it is not present on the expiring development branch.
- Vercel `sourcesevens` currently exposes only `DATABASE_URL` (Production, sensitive) and `VITE_USE_NEON_PRODUCT_API` (Production, encrypted) by name. Values are intentionally not readable through the CLI.
- Vercel has no Preview-scoped Neon/Auth variables yet.
- The role's table grants and the actual pooled URL cannot be verified from Vercel because secret values are hidden; verify the role grants in Neon SQL Editor or by using its connection string privately.

## Exact next steps

1. Deploy the auth code changes, then test sign-up, verification, sign-in, refresh, sign-out, password reset, and authenticated server JWT validation.
2. Add/confirm Preview Neon Auth settings and trusted domain against a durable Neon preview branch.
3. In Neon, grant `app_runtime_user` schema usage and only the tables/sequences required by the Vercel API. Keep migrations on the owner/direct role.
4. Copy the pooled `app_runtime_user` connection string for `main` into Vercel Production `DATABASE_URL`, replacing any owner-role URL; add Preview `DATABASE_URL` for a durable branch.
5. Do not turn on the Neon product flag until Preview smoke tests pass. Keep the existing Production flag explicitly false until then.

## Next implementation work

- Deploy the Neon Auth wiring to a Vercel Preview after the required variables and SQL are configured.
- Test sign-up, email verification (if enabled), sign-in, refresh, sign-out, password reset, and server JWT validation.
- Add remaining account, checkout/order-write, reviews, settings, image-storage, payment, notification, and admin APIs as separate verified slices.
- Keep the Neon product feature flag off and keep Supabase compatibility enabled until Preview smoke tests pass.

## Account/cart/wishlist implementation update

The current code change adds authenticated `/api/account/[resource]` routes for profile, default shipping address, notification preferences, cart, wishlist, and order history/statistics. Each request verifies the Neon Auth JWT and maps its subject to the internal UUID profile server-side; browser-supplied user IDs are ignored. `AccountPage`, cart/wishlist services, and order-history reads now use these routes instead of Supabase. Cart writes enforce active product and stock checks. The Security tab's fake saved Visa/session rows were removed; password reset sends a real Neon Auth reset email, while unsupported 2FA/session history is described as unavailable.

Required before those changes can work in production:

1. Run `neon/migrations/0005_account_runtime_permissions.sql` on Neon `main` as the owner/migration role.
2. Deploy the account API change and test profile save/avatar, address save, notification preferences, add/update/remove cart, add/remove wishlist, and order history while signed in.

Local verification for this change: `npm run build` passed (existing dynamic-import and chunk-size warnings only); `npm run test:product-categories` passed 8/8 and `npm run test:bulk-product-helpers` passed 3/3. The project-wide `tsc --noEmit` still reports pre-existing unrelated UI-import/Deno/checkout errors; no diagnostics remained in the new account API/services on the filtered rerun.

Known remaining boundary: checkout still creates orders through the Supabase browser client and the existing Stripe payment-intent Edge Function. Do not remove Supabase or claim checkout/order creation is Neon-backed until the payment intent is verified server-side and order creation is migrated. Two-factor auth and saved-payment-method/session management also need deliberate provider/API support before they can be enabled.

## Verification required before Phase 2

- Sign-up, sign-in, sign-out, session refresh, and password reset work on a Vercel Preview URL.
- An authenticated API request resolves the Neon user identity.
- An admin request is accepted only for a Neon user whose profile has `is_admin = true`.
- No browser bundle contains `DATABASE_URL`, a database password, or an auth server secret.

## Sources consulted

- Neon Auth overview: https://neon.com/docs/auth/overview
- Neon Auth webhooks/server guidance: https://neon.com/docs/guides/neon-auth-webhooks-nextjs
- Neon Postgres connection guidance: https://neon.com/docs/connect/connection-pooling
- Vercel CLI environment variable guidance: https://github.com/vercel/vercel/blob/main/skills/vercel-cli/references/environment-variables.md

## Handoff instructions

The next AI tool must read `NEON_ONLY_MIGRATION_PLAN.md` and this file, then verify Neon Auth is enabled before installing or coding against a Neon Auth SDK. It must report source files changed, tests run, and any environment variables it expects by name only.

## Account security and Neon checkout implementation update — 2026-09-23

The account security and checkout gaps have now been addressed in local source. No Vercel deployment was triggered.

- Added app-enforced TOTP with encrypted Neon-stored authenticator secrets, per-Neon-session verification, a sign-in challenge gate, failed-code lockout, and one-time recovery codes. The user chose to retain Neon Auth and use an app-level TOTP gate because managed Neon Auth does not allow installing Better Auth's native 2FA plugin.
- Active Neon Auth sessions can be listed and other sessions revoked; tokens are kept transiently in memory for revocation and are not rendered in the UI.
- Added Stripe customer association, safe card summaries, and Stripe Billing Portal link for adding/updating/removing saved cards. Card data remains with Stripe.
- Checkout settings now load from Neon. The server derives the cart quote, creates a card-only PaymentIntent tied to the Stripe customer, validates the successful PaymentIntent/cart before order creation, attempts an idempotent refund if the cart changed after charge, records order currency, writes order/items, then clears the Neon cart.
- New local migrations: `0006_stripe_checkout_permissions.sql` (Stripe customer mapping, currency on orders, checkout grants) and `0007_account_mfa.sql` (encrypted-factor metadata, recovery hashes, verified sessions, grants including read-only Neon Auth session lookup).
- New required private Vercel variables: `STRIPE_SECRET_KEY`, `APP_BASE_URL`, and `MFA_ENCRYPTION_KEY` (base64 encoding of 32 random bytes). Keep `STRIPE_SECRET_KEY` and `MFA_ENCRYPTION_KEY` server-only; neither has a `VITE_` prefix.
- Stripe Billing Portal must be enabled/configured in Stripe Dashboard for the account's customer portal. Use test Stripe keys in Preview before Live keys in Production.

Before deploying this change, run migrations 0006 and 0007 on the same Neon branch behind Vercel `DATABASE_URL`, add the server-only environment variables above, and configure the Stripe customer portal. Then deploy only to Preview and smoke-test MFA enrollment/challenge/recovery/session revocation, saved-card portal, and card checkout (non-card methods should remain disabled until enabled in Neon and tested). Do not deploy to Production until those checks pass. A production build passed during this implementation with existing bundle/dynamic-import warnings; some later build attempts were blocked before loading Vite by intermittent Windows esbuild `spawn EPERM`. The filtered TypeScript check reported no diagnostics in the changed security/account/checkout files. Product-category tests passed 8/8 and bulk-product helper tests passed 3/3. `git diff --check` passed.

## Admin shipping settings fix — 2026-09-23

- The Admin Dashboard already has a `Shipping` tab, but its settings service still used browser-side Supabase reads/writes. In the Neon-only setup this could leave the panel empty or unable to save.
- Switched the panel's admin reads/writes to an authenticated `/api/checkout/settings?admin=shipping` route. The route checks Neon Auth + admin status, validates the editable values, and accesses Neon server-side.
- Added `neon/migrations/0008_admin_shipping_settings_permissions.sql` to grant the runtime role only SELECT plus the needed shipping-method columns for UPDATE.
- This fixes the existing Standard/Express/Overnight admin settings path. It does not yet add the separately requested Jamaica local-delivery zones and central-pickup editor/checkout flow; those still need their own implementation and migration.
- Verification: `git diff --check` passed. `npm run build` was blocked before Vite loaded by Windows `esbuild spawn EPERM`; `npx tsc --noEmit` reported existing unrelated project errors (UI module specifiers, Deno types, and an App.tsx union comparison).

## Neon Data Management panel alignment — 2026-09-23

- Replaced the Data Management panel's Supabase health/count/export queries with authenticated, no-store requests to the Neon admin products API (`/api/admin/products`). The product count comes from the server's Neon query; CSV export paginates the full Neon result and uses CSV-safe serialization.
- Removed the panel's “migrate to Supabase” action because it wrote to the legacy Supabase KV endpoint, not Neon. The panel now clearly states it is read-only and does not copy legacy data.
- Tightened the existing Neon bulk-import client path so failed/partial batches are surfaced instead of being logged and then reported as a successful import.
- Local verification: `npm run build` passed with existing dynamic-import and bundle-size warnings; `npm run test:product-categories` passed 8/8; `npm run test:bulk-product-helpers` passed 3/3; `git diff --check` passed.
- Production smoke verification is still pending. Direct HTTP requests to `sourcesevens.vercel.app` were blocked by the current environment's network proxy, and the web reader could not access the API URLs. No authenticated production session is available here, so no catalog import/write was attempted. Before relying on this in Production, verify the public Neon `/api/products?limit=5` response, then sign in as admin and verify `/api/admin/products?limit=1` and the CSV import flow using a controlled test record (remove it afterward only if approved).
- The project owner reported running migration 0008. Production deployment `dpl_CttmmVygyzf3iLiCaoXM7yJEdq5o` is Ready and aliased to `https://sourcesevens.vercel.app`.
- Live smoke check: public `/api/checkout/settings` returned 200 JSON with 3 shipping methods and 1 payment method. Protected `?admin=shipping` returned 401 JSON without an auth token, as expected. A signed-in admin load/save test remains to be done.

## Neon Auth recovery and deleted app-profile repair — 2026-09-24

- Added a sign-in recovery action to resend a signup verification message for an existing Neon Auth identity. Customers can enter a verification code in the verification screen; link-based verification remains supported by redirecting to the app origin.
- After successful code verification, customers are taken directly to the existing password-reset flow when Neon does not automatically establish a session. Password reset sends its own reset message/link; it is separate from email verification.
- Added `neon/migrations/0009_restore_missing_auth_profiles.sql` and server-side self-healing in `src/server/auth.ts`. On an authenticated API request, if the app profile/mapping is missing, the SECURITY DEFINER function reads the account's email/name from `neon_auth.user` and safely restores a non-admin app profile. It does not trust browser-supplied identity fields.
- Required before production use: run migration 0009 on Neon `main` as the owner/migration role, then deploy the matching application code. No migration was run and no deployment was triggered from this workspace.
- Recovery note: this restores the profile/mapping, not records that may have been cascade-deleted with the profile (for example saved addresses, cart, wishlist, or order references). Recover those only from a database backup if required.

## Phase 1 review — pending account and checkout release — 2026-09-24

Review scope: read-only review of the current dirty worktree against `main` at `e64a45b`. No files were staged, committed, or pushed in this phase.

### Current state

- The cart API fix is already on `main` as `e64a45b`. This worktree has no commits ahead of `origin/main`, but it contains a large uncommitted change set.
- The account/checkout implementation is present locally, but it is not a complete Neon-only migration. Storefront/admin products, categories, image storage, reviews, currency, admin orders/refunds, user management, notification routes/settings, and auth fallbacks still contain reachable Supabase paths.
- `.vercelignore` excludes `.codex/` and `.playwright-mcp/`; those directories are local tooling state and must not be included in an application commit.
- The `vercel.json` rewrite uses Vercel's documented wrapped lookahead form to exclude `/api/` from the SPA fallback. The Vite build passed; a Vercel deployment/config validation has not yet been run from this workspace.

### Account and checkout review findings

- The account resource API derives the profile from the verified auth identity and ignores browser-supplied user IDs. Cart, wishlist, profile, addresses, notifications, and order-history SQL uses parameterized queries and ownership filters.
- The checkout API recalculates the quote from Neon cart/product/shipping/rate rows and checks the Stripe PaymentIntent against the current cart before writing an order. This is a useful server-side trust boundary.
- Stripe intent creation currently has no idempotency key. Repeated requests can create multiple intents for one cart; use a stable request/cart key or another server-issued checkout key before production checkout is relied upon.
- PaymentIntent creation, Stripe refund, and the Neon order transaction are separate systems. A database failure after a successful charge can leave a paid intent without a committed order. Add a webhook/reconciliation path and test recovery, or document and implement a reliable compensation path before treating card checkout as production-complete.
- Jamaica address delivery and central pickup are absent from the pending checkout change. `CheckoutPage` sets `shipping_country` to `United States`, and server checkout only accepts the generic `standard`, `express`, and `overnight` shipping methods. The requested Jamaica zones, pickup locations, editable hours, and local-only cart eligibility require a separate API/schema/UI slice.
- Account avatar upload stores a base64 data URL in `user_profiles.avatar_url`; this is not the planned object-storage replacement and stores image bytes in the database. The 3,000,000-character API limit also needs alignment with Vercel request limits and an explicit maximum file type/size policy.
- Notification delivery still calls the Supabase Edge Function from the checkout UI. It is best-effort and caught, so order creation may succeed while customer/supplier email delivery silently fails. Move notification dispatch behind a Neon/Vercel endpoint and expose delivery failure/observability.
- MFA, saved-card portal, and session list/revoke depend on Neon migrations and provider behavior. Source review cannot prove the deployed Neon Auth schema, Stripe portal configuration, or session API compatibility.

### Migration and environment gates

- Migration files `0003_runtime_role_product_api_grants.sql`, `0006_stripe_checkout_permissions.sql`, and `0008_admin_shipping_settings_permissions.sql` are untracked in this worktree. Confirm they are applied to the exact Neon branch used by the Vercel environment before testing routes that need their grants. Migration `0007_account_mfa.sql` and `0009_restore_missing_auth_profiles.sql` are present in the repository history, but their live application status is not observable here.
- The pending server configuration expects private Vercel variables by name: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`, `STRIPE_SECRET_KEY`, `APP_BASE_URL`, and `MFA_ENCRYPTION_KEY`. Browser configuration uses `VITE_NEON_AUTH_URL` and `VITE_STRIPE_PUBLISHABLE_KEY`. Never expose the database URL, Stripe secret, or MFA encryption key through a `VITE_` variable.
- Do not enable the Neon product flag until the product API grants and admin CRUD/import smoke tests pass. Do not remove Supabase environment variables or packages while active runtime paths still reference them.

### Phase 2 file list — review/fix/test the account and checkout slice

Include only these relevant pending files when implementing this slice:

- `src/components/AccountPage.tsx`, `src/components/CheckoutPage.tsx`, `src/components/OrdersPage.tsx`, `src/components/StripePaymentForm.tsx`
- `src/utils/authService.ts`, `src/utils/commerceSettingsService.ts`, `src/utils/ordersService.ts`, `src/utils/paymentService.ts`, `src/utils/shippingMethodsService.ts`, `src/utils/userNotificationPreferencesService.ts`, `src/utils/userService.ts`, `src/utils/wishlistService.ts`, `src/utils/authSessionsService.ts`, `src/utils/paymentMethodsService.ts`
- `api/account/payment-methods.ts`, `api/checkout/settings.ts`, `api/payments/create-intent.ts`, `api/payments/place-order.ts`
- `src/server/checkout.ts`, `src/server/stripe.ts`
- `neon/migrations/0006_stripe_checkout_permissions.sql`, `neon/migrations/0008_admin_shipping_settings_permissions.sql`
- `.env.example` and `vercel.json` only after validating the variable names and Vercel rewrite configuration.

Keep branding edits in `AboutPage.tsx` and `ContactPage.tsx` out of this backend release. Keep `.codex/`, `.playwright-mcp/`, and `.vercelignore` out unless a separate review establishes they are needed for deployment.

### Phase 2 verification commands and manual gates

Run after implementation in the project environment:

1. `git diff --check`
2. `npm run test:product-categories`
3. `npm run test:bulk-product-helpers`
4. `npx tsc --noEmit` (separate existing diagnostics from new diagnostics)
5. `npm run build`

There are currently no dedicated account, MFA, payment, or checkout tests in `package.json`; add focused route/service tests for anonymous/customer/admin access, cart isolation and stock rules, MFA lockout/recovery, payment amount/currency/cart mismatch, duplicate order submission, and database failure after Stripe success. Then smoke-test on Vercel Preview using Stripe test credentials and a Neon branch with the required migrations. Production deployment is not approved by this review phase.

### Phase 1 result

The account/checkout changes are a candidate for a focused Preview release after the listed defects and tests are addressed. They are not yet ready to commit/push as a complete Neon cutover. The full cutover still requires catalog/admin, image storage, reviews, currency/settings, admin order/refund, notifications, and auth fallback work.

## Phase 2 implementation and local verification — 2026-09-24

Implemented the following local changes. Source changes remain unstaged and uncommitted; see the Preview deployment note below.

- Added an admin-authorized Neon payment-method settings endpoint at `/api/checkout/settings?admin=payments`; `commerceSettingsService.getAllPaymentMethods` and `savePaymentMethods` now use it instead of Supabase. The endpoint accepts only the three known payment codes and validates the complete settings list.
- Added a protected `/api/checkout/quote` endpoint so cash/bank-transfer customers see the total calculated from Neon before placing the order.
- Added `neon/migrations/0010_checkout_payment_settings_permissions.sql`. It grants only the settings columns needed by the payment-method editor and narrows the order UPDATE permission from migration 0006 to `status` and `updated_at`.
- Added a client-generated checkout attempt ID and a server-derived Stripe PaymentIntent idempotency key based on the customer profile, attempt, cart fingerprint, and checkout contact details. Retries within one attempt reuse the same intent; after a confirmed refund the UI starts a fresh attempt.
- Added post-charge order recovery: after order persistence reports an error, the API checks Neon for an already-committed order before issuing an idempotent refund. If reconciliation fails or a refund fails, the customer receives a support message that warns them not to retry blindly.
- Order placement now retrieves the latest Stripe charge and rejects any previously refunded payment before writing an order.
- Added a required checkout-attempt ID to Neon order placement and migration `0011_checkout_attempt_idempotency.sql`, which adds a per-customer unique idempotency key. Retried card and cash/bank submissions return the already-created order instead of duplicating it. Neon order creation clears the cart in the same transaction, so the frontend no longer makes a second potentially misleading clear request.
- Payment/order APIs now return generic messages for unexpected Stripe/database errors instead of returning internal provider/database error text.
- Added eight focused unit tests covering payment-setting validation, PaymentIntent idempotency, and paid-order recovery decisions. Neon documents using a unique idempotency key and treating retry conflicts as the prior successful operation; this phase uses a partial unique index for compatibility with PostgreSQL versions that do not support newer `ON CONFLICT DO SELECT` syntax.
- Consolidated `/api/checkout/quote` and `/api/checkout/settings` behind `api/checkout/[action].ts` after the first Preview deployment hit Vercel Hobby's 12-function limit. This preserves both paths while reducing the API function count from 13 to 12.

### Local verification results

- `git diff --check` — passed.
- `npm run test:checkout-settings` — passed, 8 tests.
- `npm run test:product-categories` — passed, 8 tests.
- `npm run test:bulk-product-helpers` — passed, 3 tests.
- `npm run build` — passed. Existing warnings remain for mixed dynamic/static imports, a large JavaScript chunk, and active Supabase imports.
- `npx --no-install tsc --noEmit` — failed on existing project diagnostics: package imports with version suffixes in `src/components/ui`, Deno/Supabase Edge Function types, and the existing `src/App.tsx` union comparison. It reported no diagnostics in the Phase 2 API/server/service changes.
- The Vercel remote build for Preview passed after the route consolidation. A later local `npm run build` attempt hit the Windows `spawn EPERM` error; Vercel's hosted build remained successful.

### Preview deployment and smoke test — 2026-09-24

- Created a Preview-only deployment for `sourcesevens`: https://sourcesevens-az8o3w7s7-chads-projects-03349a29.vercel.app (deployment `dpl_FfRRoNGitWbrNPrPT6wtdcvFhhkC`, status `READY`). Production was not changed.
- Static app entrypoint `HEAD /` returned `200 OK`.
- Read-only smoke requests to `/api/categories`, `/api/products?limit=5`, `/api/checkout/settings`, and unauthenticated `POST /api/checkout/quote` all returned `FUNCTION_INVOCATION_FAILED`.
- Expanded Vercel runtime logs identify the common root cause: `DATABASE_URL is required by the product API` during module initialization in `src/server/db.ts`.
- `vercel env ls preview` reports **no environment variables** configured for the project Preview target. The Preview API cannot run until the required Preview-scoped settings are added; do not copy a production Neon URL unless it is intentionally the Preview database target.
- The interactive browser surface is unavailable in this session, so the UI has not been visually tested. The deployment's API failures were confirmed via Vercel's deployment-aware CLI requests and runtime logs.
- After the user explicitly requested Production, created a `--prod --skip-domain` candidate deployment `dpl_HFjZFfxukMShLh2joQPo5sjiBoMG` (`https://sourcesevens-ipjlkmd1q-chads-projects-03349a29.vercel.app`). Its production build is `READY`; safe GET checks for categories, products, and checkout settings passed, and unauthenticated quote POST correctly returned `Authentication required`.
- The candidate has not been promoted to the primary `https://sourcesevens.vercel.app` domain; that domain still resolves to prior deployment `dpl_7ezeKgJGyJRwEDZ9ZxFmQAHT9B7P`.
- Do not promote yet: Production has no `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, or `APP_BASE_URL`, while the production checkout settings API reports only `card` active. This would leave checkout unable to complete a card payment and without a cash/bank fallback; saved-card portal is also unconfigured. Enable a non-card method through the payment settings or configure Stripe/portal secrets before promotion.
- The user approved enabling Cash on Delivery and Bank Transfer. Direct production DB access is blocked because the Production `DATABASE_URL` is marked encrypted/sensitive and Vercel CLI exposes its name but not a usable value to `env run`; no database changes were made. Request the owner to execute the exact two-code `is_active` update in the Neon SQL Editor, verify the returned rows are active (and that bank-transfer instructions are configured), then re-check the production settings API before promoting the candidate.

### Required before Phase 2 Preview can pass smoke tests

1. Apply/confirm migrations 0006, 0007, 0008, 0010, and 0011 on the Neon branch used by Vercel Preview. Migration 0010 must run after 0006; 0011 adds the checkout attempt index. The workspace cannot inspect Neon migration history or grants.
2. Add the required variables to the Vercel **Preview** environment (currently none are configured): private `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`, `STRIPE_SECRET_KEY`, `APP_BASE_URL`, and `MFA_ENCRYPTION_KEY`; browser-visible `VITE_NEON_AUTH_URL` and `VITE_STRIPE_PUBLISHABLE_KEY`. Use the Neon branch intended for Preview and Stripe test credentials. Never share values in chat or logs.
3. On Preview, test customer profile/address save, cart add/update/remove, wishlist add/remove, order history, MFA setup/challenge/recovery/session revoke, Stripe saved-card portal, payment settings as admin, forbidden payment-settings access as customer/anonymous, cash/bank order creation where enabled, and card checkout with Stripe test keys.
4. Test the Stripe/Neon fault path with a controlled failure in Preview: confirm a previously committed order is not refunded; confirm an absent order is refunded idempotently; confirm database reconciliation failure never triggers a blind duplicate charge.

### Phase 2 status

Local code and unit tests are complete for this implementation slice. A Preview deployment exists, but API smoke tests are blocked by missing Preview environment variables; UI and authenticated checkout flows remain unverified. A production-target candidate was built and read-only API checks passed, but the primary domain was not promoted because checkout currently exposes only card while Stripe is unconfigured. No files were staged, committed, or pushed. This phase does not implement Jamaica delivery zones/central pickup, image storage, order email delivery, admin order/refund APIs, or remove the remaining Supabase compatibility code; those remain later migration work.
