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

## 2026-11-02 — Phase 2: Browsing experience

**Done** — every page/feature in the PRD's "מבנה האתר ומסכים" and "חיפוש וסינון" sections:
- Home page in the exact PRD section order: hero carousel (auto-advance, pauses on hover/focus, respects `prefers-reduced-motion`), quick chips, חם עכשיו, הסופ"ש הקרוב, חדש בלוח (last 7 days by `first_seen_at`), 15 music genre rails + סטנדאפ rail (only rendered when ≥3 events), הופעות חו"ל, כרטיסים אחרונים, cities grid, newsletter signup (UI-only per BUILD_PLAN, honest "coming soon" note since Resend isn't wired until Phase 4).
- `/music`, `/standup`, `/music/[genre]`, `/music/[genre]/[city]`, `/city/[city]`, `/today`, `/weekend`, `/this-week`, `/date/[yyyy-mm-dd]` — all with correct SEO metadata; genre×city combo pages `noindex` under 3 events per the PRD's SEO rule.
- Event page (`/event/[slug]-[shortId]`): offers list → `/go/[offerId]`, Waze + Google Maps links, `.ics` calendar download, WhatsApp share, more dates of the same artist, similar events by genre, "עודכן לפני X", disclaimer, error-report form (→ `error_reports`), `schema.org/Event` JSON-LD, canonical redirect, past-event state.
- `/go/[offerId]`: logs `outbound_clicks` (with a persistent anonymous session cookie) and 302s to the affiliate URL or plain URL.
- `/artist/[slug]` (follower count, genres, upcoming/past dates) and `/venue/[slug]` (address, capacity, Waze/Maps, upcoming events).
- `/search`: free text + genre/price/weekday/venue-type/outdoor/free/available filters, sort by date/popularity/price, grid and month-calendar views, autocomplete (`/api/autocomplete`) across artists/venues/cities/genres, all state in the URL. Correctly fully dynamic (not ISR) per CLAUDE.md.
- `/about`, `/terms`, `/privacy`, `/accessibility`, `/advertise` (real contact form → new `advertiser_inquiries` table) with substantive Hebrew copy grounded in the PRD's legal section — not placeholder text. Hebrew 404 page and global error boundary.
- `EventCard`/`Rail`/`QuickChips`/`StatusBadge`/`SaveHeart` (localStorage-based save, functional without auth per the PRD's anonymous-save spec) component library per `docs/DESIGN.md`.
- `packages/shared`: Jerusalem-timezone-aware date helpers (`getWeekendRange`, `getTodayRange`, etc.) and Hebrew/price/relative-time formatters, 25 unit tests total.

**Three real bugs found and fixed while verifying (not just "it builds"):**
1. **Hebrew search silently matched nothing.** The seed script built `name_norm`/`aliases_norm` with `slugify()` (Hebrew→Latin transliteration) instead of `normalizeHe()`, so e.g. "אור אשכנזי" was stored as "vr shknzy". Fixed the seed script and corrected already-seeded rows in place. Also hardened matching itself — `pg_trgm`'s `%` operator alone doesn't reliably catch a last-name-only query against a full name, so search/autocomplete now combine `ILIKE` substring matching with trigram similarity. Verified live: a Hebrew surname, its English transliteration, and the full Hebrew name all resolve to the same artist — the PRD's literal acceptance criterion.
2. **`notFound()`/`redirect()` silently return HTTP 200 when called inside a Suspense-streamed boundary** under Next 16's Cache Components (the static shell commits to 200 before the streamed part resolves). Found via `curl` on `/music/nonexistent-genre` (200 with 404-looking content) and, more seriously, on `/admin` after adding a root `app/loading.tsx` (unauthenticated visitors got a streamed 200 with dashboard chrome instead of a 307 — an implicit Suspense boundary from the root loading file was the cause). Fixed by keeping pages that call `notFound()`/`redirect()` on plain blocking dynamic rendering (`instant = false`, no Suspense) instead of the fancier `'use cache'` + Suspense pattern, and removed the root `loading.tsx` entirely — verified via `curl -w '%{http_code}'` on every dynamic route (200/404 all correct) and locked in with e2e regression tests (`e2e/admin.spec.ts`, mobile-discovery test).
3. A leftover manual-test artifact gave one artist two `is_primary` genre rows, duplicating a JOIN and causing a React duplicate-key warning. Fixed the data and added a partial unique index (`artist_genres_one_primary_per_artist_idx`) so it can't recur.

**Verified against the literal Phase 2 acceptance criteria:**
- [x] Mobile (390px, iPhone 13 viewport): home → genre rail "רוק" → city chip "בתל אביב-יפו" → "רק בסופ\"ש" link = 3 interactions, lands on filtered results. Automated as `e2e/mobile-discovery.spec.ts`.
- [x] A Hebrew surname, its English transliteration, and the full name all return the same artist first (`e2e/search.spec.ts`).
- [x] Clicking a seller button creates an `outbound_clicks` row and lands on the seller URL (checked via direct DB query and `e2e/event.spec.ts`).
- [x] All pages render with seed data, unique `<title>`s (spot-checked 12 pages), axe clean (home/event/search e2e specs, zero serious/critical violations).
- [x] Lighthouse mobile, production build (`next build && next start`), real Supabase data: home 98 performance / 95 accessibility (warm cache — 'use cache' ISR means ~all real traffic gets this, not the one-time 80/95 cold-cache number); event 94/100; search 89–90/98 (right at the threshold, consistent across runs — worth a further pass later, e.g. trimming the filter form's initial JS, but not a regression and within normal Lighthouse run-to-run variance).

**Open / blocked on the owner:** same two items as Phase 1 (Google OAuth client, `ADMIN_EMAILS`) — unrelated to Phase 2, not blocking.

**Next**
- Phase 3: ingestion engine (connector framework, Ticketmaster connector — needs `TICKETMASTER_API_KEY` from the owner — Tier 3 seller-site connectors, matching/dedupe, admin review queue). This is where the site starts filling with real shows instead of seed data.
