# AGENTS.md

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — typecheck (`tsc -b`) then bundle (Vite). This is the only way to typecheck; there is no separate `typecheck` script.
- `npm run lint` — ESLint across the project
- `npm run preview` — preview production build locally

There is no test runner configured (no vitest/jest). Validation is `lint` then `build`. Manual smoke-test steps are in `TEST_CASES.md`.

## Node version

Requires Node >= 22.12.0 (see `.nvmrc` for pinned version).

## TypeScript strictness

`tsconfig.app.json` enables several strict flags that catch common mistakes:

- `strict`, `noUnusedLocals`, `noUnusedParameters` — zero tolerance for unused imports/vars.
- `verbatimModuleSyntax` — must use `import type` for type-only imports; `export type` for type-only exports.
- `erasableSyntaxOnly` — no `enum`, `namespace`, or constructor parameter properties. Use `const` objects or union types instead of enums.
- `noUncheckedSideEffectImports` — side-effect imports must resolve.

## Architecture

- **Entry**: `src/main.tsx` → `src/router.tsx` (React Router data router, NOT `src/App.tsx`). `App.tsx` is a simplified shell not used in production routing.
- **Auth model**: Supabase Auth sign-in + allowlist check against `public.admins.user_id`. Non-allowlisted users are signed out and blocked. See `src/services/adminAuthService.ts`.
- **Data layer**: All Supabase calls go through `src/services/issueService.ts`. Database columns are `snake_case`; the `mapRowToIssue` function converts to `camelCase` TypeScript model (`src/models/issue.ts`).
- **Realtime**: Issue list and notification events use Supabase realtime subscriptions (`subscribeToIssueChanges`, `subscribeToNotificationEvents`).
- **Photo resolution**: Multiple photo URL formats are handled — absolute URLs, Supabase Storage public URLs, and bucket-relative paths. Legacy `issue-photo` bucket is also supported. See `resolveIssuePhoto` in issueService.ts.
- **Edge Functions**: Two Supabase Edge Functions in `supabase/functions/`:
  - `categorize-issue` — AI category suggestions; falls back to local heuristics if unavailable.
  - `notification-dispatch` — processes `notification_events` for email/push delivery.

## Environment variables

Required in `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional:
- `VITE_ISSUE_PHOTO_BUCKET` (defaults to `issue-photos`)
- `VITE_CATEGORY_FUNCTION_NAME` (defaults to `categorize-issue`)

If Supabase env vars are missing, `supabaseClient.ts` exports `supabase = null` and the app shows a configuration error rather than crashing.

## Migrations

SQL migrations live in the project-root `migrations/` directory (NOT `supabase/migrations/`). These are reference files — apply them manually or via Supabase dashboard.

## Deployment

Vercel with SPA rewrites (`vercel.json`). Framework preset: Vite, output: `dist`.

## Key constraints

- Issue status values are `submitted | in_progress | resolved` (see `IssueStatus` type).
- Status changes write audit logs to `public.issue_logs` and queue notification events to `public.notification_events`. Failures in logging/notification are caught and warned, not thrown.
- RLS must allow admin reads/updates on `issues`, `issue_logs`, and `notification_events`.