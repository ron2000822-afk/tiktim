# Progress Log — Tiktim

## 2026-11-01 — Phase 0: Foundation

**Done**
- pnpm + Turborepo monorepo: `apps/web`, `packages/db`, `packages/ingest`, `packages/shared`.
- `apps/web`: Next.js 16 (App Router), TypeScript strict, Tailwind v4, ESLint.
- RTL base layout (`<html lang="he" dir="rtl">`), Heebo font via `next/font`, placeholder header/footer, design tokens from `docs/DESIGN.md` as CSS variables + Tailwind `@theme`.
- `packages/shared`, `packages/db` (Drizzle config + empty schema, pointed at Supabase via `DATABASE_URL`), `packages/ingest` (CLI entry stub) — real content lands in Phase 1 / Phase 3.
- Vitest (one passing unit test in `packages/shared`) and Playwright (one e2e test on the home page, including an axe accessibility check) both pass.
- GitHub Actions CI (`lint`, `typecheck`, `test` on every push).
- `.env.example` with all keys from `CLAUDE.md`.
- git initialized, remote set to `https://github.com/ron2000822-afk/tiktim.git`.

**Caught by the axe check:** the first version of the header's "התחברות" button used white text on the accent color (`#FF3D7F`), giving a 3.37:1 contrast ratio — below the WCAG AA 4.5:1 minimum from `docs/DESIGN.md`. Fixed by switching to dark text on the accent background, per the design doc's own guidance ("use dark text if needed").

## 2026-11-02 — Phase 0 complete

**Done**
- `ron2000822-afk/tiktim` on GitHub connected as `origin`; Phase 0 commit pushed to `main`. CI runs on every push.
- Vercel project connected by the owner (Root Directory `apps/web`).
- Supabase project `tiktim` created; `.env.local` filled in (root-level, symlinked into `apps/web/.env.local` so Next.js picks it up; `packages/db` loads it explicitly via `packages/db/src/load-env.ts` since drizzle-kit/tsx run with `cwd=packages/db`).
- First (empty) migration generated and applied against the real Supabase Postgres instance — `pnpm db:generate && pnpm db:migrate` both succeed. Connection pipeline confirmed end to end.

**Security note:** during setup, a screenshot containing the Supabase DB password in plaintext was briefly placed in `docs/`. It was never committed (caught before `git add`, and `docs/Screenshot*` is now in `.gitignore`), and the password was reset. Worth remembering for later phases: never save dashboard screenshots with visible secrets into the repo folder.

**Open / blocked on the owner**
- [ ] Open questions from `docs/PRD.md` "שאלות פתוחות" (domain/trademark for "טיקטים", first producer outreach, artist photo fallback for artists missing from Wikimedia Commons, numeric 3-month targets) — none block the next phase.

**Next**
- Start Phase 1: full Drizzle schema from `docs/DATA_MODEL.md`, taxonomy + Hebrew normalization (`normalizeHe`, `slugify`) in `packages/shared`, realistic Hebrew seed data (~40 cities, ~60 venues, ~120 artists, ~250 events), `/admin` skeleton gated by `ADMIN_EMAILS`.

## 2026-11-02 — Phase 1: Data model, taxonomy, seed, admin skeleton

**Done**
- Full schema from `docs/DATA_MODEL.md` in `packages/db/src/schema.ts` — 22 tables, all enums, indexes (including `gin_trgm_ops` trigram indexes on `artists.name_norm` / `venues.name_norm`), `pg_trgm` + `unaccent` + `citext` extensions, RLS enabled with owner-only policies on `profiles`/`follows`/`saved_events` and no-policy (server-only) RLS on `email_subscriptions`/`notifications_log`, and a generic `set_updated_at` trigger applied to all 13 tables that have an `updated_at` column. `auth.users` is declared as a read-only FK reference only (our connection role can't and shouldn't create it — Supabase owns that table).
- `packages/shared`: `taxonomy.ts` loads and zod-validates `docs/taxonomy.json` directly (single source of truth, no duplication); `text.ts#normalizeHe` and `slugify.ts#slugify` implemented per `docs/INGESTION.md`'s exact rules. 17 unit tests covering niqqud, gershayim/geresh, mixed Hebrew/English, and final-letter folding.
- Seed script (`packages/db/src/seed.ts` + `seed-data.ts`): 9 regions, 40 real Israeli cities, 56 real venues (named where well-known — Barby, Hangar 11, Zappa, Caesarea Amphitheater, Menora Mivtachim Arena, etc. — generated `היכל התרבות {city}` pattern for smaller cities), 120 **fictional** artists (mix of solo/band-style Hebrew names + 8 international acts, 1–2 genres each), 250 events over the next 4 months with realistic prices/statuses/tags, 1–3 ticket offers per event from 4 generic placeholder sources ("מוכר א׳"..."מוכר ד׳"). Deterministic (seeded PRNG + index-derived `short_id`), so re-running on the same day is a true no-op — verified by running it twice and diffing row counts.
- `/admin` behind Supabase Auth (Google) + `ADMIN_EMAILS`: `(protected)` route group gates on session + email allowlist (denies with a Hebrew "אין לך הרשאה" page if logged in but not allowlisted); dashboard with counts; events list (search, mark/unmark featured); artists list (search, edit primary genre); venues list (search). Catalog reads/writes go straight through `@tiktim/db` (direct Postgres connection, not PostgREST) — Supabase Auth is used only for session/identity.
- Next.js 16's new Cache Components feature required `export const instant = false` on the admin route segments (they're auth-gated and always dynamic, not prerendering candidates) and `middleware.ts` → `proxy.ts` (renamed convention in Next 16).

**Verified**
- `pnpm db:migrate && pnpm db:seed` on the real Supabase instance: clean run, then re-run with identical row counts (idempotent) — acceptance criterion met.
- `normalizeHe`/`slugify` unit tests: 17/17 passing, covering niqqud/gershayim/mixed-language per the acceptance criterion.
- Unauthenticated request to `/admin` → 307 to `/admin/login` (confirmed live against `pnpm dev`).
- Artist genre mutation (the same delete+insert `setArtistGenre` does) tested directly against the DB: persisted and re-read correctly.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass across all 4 packages.

**Not verified — needs the owner:** the actual Google OAuth round-trip (login → denied page for a non-admin account → successful admin login) can't be tested without a real Google OAuth client. The code path is in place and the pieces around it (session gate, allowlist check, redirect) are verified independently, but this is the one part of Phase 1's acceptance criteria I can't close out myself.

**Open / blocked on the owner**
- [ ] **Google OAuth**, two steps:
  1. Google Cloud Console → create an OAuth 2.0 Client ID (type: Web application). Authorized redirect URI: `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`.
  2. Supabase Dashboard → Authentication → Sign In / Providers → Google → paste the Client ID + Client Secret, enable it.
- [ ] Set `ADMIN_EMAILS=ron2000822@gmail.com` (or whichever address you'll log in with) in `.env.local` **and** in Vercel's env vars for all three environments, then redeploy.
- [ ] Once both are done: visit `/admin/login`, sign in, confirm you land on the dashboard; optionally test the deny path by signing in with a different Google account first.
- [ ] Open questions from `docs/PRD.md` "שאלות פתוחות" — still none blocking.

**Next**
- Phase 2: browsing experience (home page sections, event/artist/venue/city/date pages, search with filters, `/go/[offerId]` redirect + click logging). This is the phase that decides whether the product wins, per the PRD.
