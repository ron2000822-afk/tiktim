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
