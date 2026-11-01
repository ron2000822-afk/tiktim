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

**Open / blocked on the owner**
- [ ] Supabase project not created yet — `DATABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` still empty in `.env.local`. Blocks: running the first (empty) migration, and the Vercel preview actually connecting to a DB.
- [ ] Nothing pushed to GitHub yet (repo `ron2000822-afk/tiktim` exists and is linked as `origin`, but empty — no commits pushed).
- [ ] Vercel project not connected yet.
- [ ] Open questions from `docs/PRD.md` "שאלות פתוחות" (domain/trademark for "טיקטים", first producer outreach, artist photo fallback for artists missing from Wikimedia Commons, numeric 3-month targets) are still unanswered — none block Phase 0.

**Next**
- Once Supabase keys are in `.env.local`: run `pnpm db:generate && pnpm db:migrate` to prove the empty migration pipeline end to end.
- Commit and push Phase 0 to GitHub; connect the repo to Vercel for a preview deploy.
- Then start Phase 1 (full Drizzle schema from `docs/DATA_MODEL.md`, taxonomy + Hebrew normalization in `packages/shared`, realistic seed data, `/admin` skeleton).
