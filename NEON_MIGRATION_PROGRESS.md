# Neon-only migration progress

Last updated: 2026-09-23

## Current phase

Phase 1 — Neon runtime and identity foundation

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

This is implementation-ready but not production-active yet. It still requires the Vercel variables and Neon SQL migration below, followed by Preview smoke tests. Do not treat signup as verified until those checks pass.

## Setup confirmed by project owner

- Neon Auth is enabled on Neon `main`.
- The production domain is already in Neon Auth trusted domains.
- Vercel `VITE_NEON_AUTH_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_JWKS_URL` are configured for the project.
- The profile-mapping migration ran successfully on `main`/`neondb`. A read-only verification query confirmed the mapping column, unique index, trigger function, and auth-user trigger exist.
- Production still needs a code deployment before account flows can be tested against this wiring.

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
- Add authenticated profile/address APIs, then migrate `AccountPage` and `userService`; those browser profile operations still depend on Supabase and are not migrated by this auth work.
- Keep the Neon product feature flag off and keep Supabase compatibility enabled until Preview smoke tests pass.

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
