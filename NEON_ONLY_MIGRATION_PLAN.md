# Source Sevens: Neon-Only Migration Plan

## Goal

Move the storefront from Supabase to Vercel + Neon, with Neon as the database and authentication source, server-side Vercel APIs as the only data boundary, and Neon or S3-compatible object storage for product images.

Current state: Neon `main` is provisioned with the baseline schema, canonical categories (`rolling-bearings`, `mounted-linear-units`), and zero products. The product/category API is implemented and the Neon feature flag remains off. The repository is linked to Vercel project `sourcesevens`, which has no deployment yet.

## Rules for every AI tool

- Read this plan and the relevant source files before editing.
- Never expose, commit, or print secrets.
- Keep `DATABASE_URL` server-only. Never use a `VITE_` prefix for it.
- Use the pooled Neon URL for Vercel runtime and the direct URL for migrations.
- Do not edit historical Supabase migrations; add forward migrations or new API adapters.
- Do not enable `VITE_USE_NEON_PRODUCT_API` until the phase gate passes.
- Run focused tests, build, and `git diff --check` before handing off.
- Report files changed, commands run, results, and remaining risks.

## Phase 0 — Documentation and inventory

Owner: research/documentation AI.

Read the Neon Auth, Neon Postgres, Neon Object Storage, Vercel Functions, and Stripe documentation. Inspect `src/utils/authService.ts`, `src/utils/storage.ts`, `src/utils/ordersService.ts`, `src/utils/cartService.ts`, `src/components/AccountPage.tsx`, `src/components/AdminPage.tsx`, `src/server/auth.ts`, `src/server/schema.ts`, `api/`, and `neon/migrations/`.

Deliverables: a list of supported APIs and signatures, an auth/storage decision, a route inventory, and a dependency map showing every remaining Supabase call.

Gate: no implementation begins until the selected Neon Auth and storage APIs are verified from current documentation.

## Phase 1 — Neon runtime and identity foundation

Status: preparation complete; implementation is blocked on Neon Auth enablement, trusted domains, and a restricted runtime role. See `NEON_MIGRATION_PROGRESS.md`.

Owner: infrastructure AI.

1. Enable Neon Auth for the Neon project and add the Vercel production and preview domains.
2. Create a restricted Neon runtime role for Vercel. Keep the owner role for migrations.
3. Add forward SQL for any auth-to-`user_profiles` mapping needed by the chosen Neon Auth model.
4. Add server helpers that validate the selected Neon Auth session/JWT and resolve the Neon user ID.
5. Keep the existing Supabase auth adapter behind a temporary compatibility switch.

Verification: sign-up, sign-in, sign-out, session refresh, password reset, and admin-role lookup work in a preview environment; no browser bundle contains `DATABASE_URL` or a secret key.

## Phase 2 — Server API boundary for user data

Owner: backend AI.

Create authenticated Vercel APIs backed by Neon for:

- profiles and addresses;
- carts and wishlists;
- orders and order items;
- reviews;
- currency, shipping, payment, and notification settings;
- admin users and admin order operations.

Move each browser service to call its API. Use the existing Drizzle schema and add migrations for any missing columns or indexes. Enforce authorization in the API using the Neon identity helper; never trust client-provided user IDs.

Verification: route tests cover anonymous, ordinary-user, and admin access; a test user can create a cart, place an order, view it, and update their profile without direct database calls from the browser.

## Phase 3 — Image storage and payments

Owner: storage/payments AI.

Choose Neon Object Storage if enabled for the project; otherwise use an S3-compatible bucket. Add server-side signed upload/download routes, migrate product image URLs, and remove browser-side Supabase Storage calls. Move Stripe and DimePay secret operations into Vercel server routes with webhook signature verification.

Verification: an admin uploads an image, a customer can view it, and a test payment/webhook updates the Neon order state without a secret reaching the browser.

## Phase 4 — Product and category cutover

Owner: catalog AI.

Use the existing Neon product/category APIs. Add any missing admin bulk routes and ensure all admin reads, writes, imports, deletes, stock updates, and category management use Neon. Keep the canonical IDs and root-only product support. Enable `VITE_USE_NEON_PRODUCT_API` only in Preview first, then Production.

Verification: product CRUD, category CRUD, child/grandchild navigation, CSV import, image upload, and admin list views work against Neon with Supabase disabled.

## Phase 5 — Remove Supabase and deploy

Owner: release AI.

Remove Supabase client packages, browser imports, Edge Functions, legacy KV paths, and Supabase-only environment variables after all previous gates pass. Update documentation and `.env.example`. Deploy Preview, run smoke tests, then deploy Production.

Verification: `rg` finds no active Supabase runtime imports; focused tests, TypeScript checks, and build pass; Vercel API routes return successful responses; the production app can authenticate, browse, upload, order, and administer products.

## Handoff prompt template

```text
You are executing Phase N of NEON_ONLY_MIGRATION_PLAN.md.
Read the plan and the listed source files first. Use only documented APIs from the cited vendor documentation. Do not print or commit secrets, change production data, deploy, or enable the Neon feature flag unless this phase explicitly authorizes it.
Implement only this phase, run its verification checklist, and report:
1. sources read;
2. files changed;
3. commands/tests and results;
4. unresolved blockers and the next phase handoff.
```

## Current manual prerequisites

Before Phase 1 implementation can be verified, the project owner must enable Neon Auth, add the Vercel preview/production domains, and choose the image-storage provider. Vercel also needs preview-scoped `DATABASE_URL`, existing public Supabase variables during the compatibility period, and server-side auth variables until Phase 5 removes the compatibility path.
