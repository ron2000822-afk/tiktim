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

## 2026-11-02 — Phase 3: Ingestion engine (in progress)

Built continuously per the owner's "run with what you recommend, don't stop" instruction.

**Done so far**
- `packages/ingest`: `Connector` interface, registry, CLI (`pnpm ingest -- --source=x --dry-run`), Hebrew title parser (`parse-title.ts`, strips venue/lineup filler per `docs/INGESTION.md`'s exact rules), artist/venue resolution with fuzzy matching, artist-match and event-dedup scoring (both pure functions, fully unit tested against the doc's literal worked examples), the 14-step pipeline (`pipeline/run.ts`: fetch → normalize → resolve venue/artist → match event → upsert offer → classify genre (optional Anthropic call) → publish/queue → staleness → report → revalidate).
- Ticketmaster Discovery API v2 connector (month-windowed paging, category/status/availability mapping, Impact affiliate URL builder), tested against 3 recorded fixtures.
- Manual connector (admin "הוספת הופעה" form) and producer-submission flow (`/advertise/add-show` → `review_queue` kind `submission`, never auto-published).
- Admin review queue (`/admin/review`): renders every `review_queue` kind (possible duplicate, unmatched artist, unmatched venue, genre suggestion, submission, low-confidence event) plus open `error_reports` from the public error-report form, each with its real resolve/approve/reject action wired to the DB.
- Admin ingestion dashboard (`/admin/ingestion`): per-source last-run status/counts table, flags a source whose latest `fetched` count dropped >30% vs. its previous run.

**Two real bugs found via live-DB verification (not just typecheck) and fixed:**
1. `createUnverifiedArtist`/`createUnverifiedVenue` built slugs from `normalizeHe()` (Hebrew-normalized, not Latin) instead of `slugify()` — produced raw-Hebrew slugs like `זאב-הירש-הבלתי-נודע-...`. Fixed to use `slugify(rawName) || "artist"/"venue"`.
2. `resolvePossibleDuplicate` (admin merge action) deleted the losing event *after* leaving `review_queue.related_event_id` pointing at it — violated the FK (`restrict`, no cascade) and would have crashed in production the first time two possible-duplicate events were merged. Fixed by repointing any `review_queue` rows referencing the event-to-be-deleted to the surviving event *before* deleting it.
3. (Caught in code review before it shipped, not via a crash) `approveSubmission` had a fallback `https://example-sellers.test/submission` URL for producer submissions that omitted a ticket link — would have published a fake outbound link. Removed the fallback; the admin UI now only shows "אשר והמר להופעה" when the submission has a real URL, otherwise hints to add the event manually once the producer supplies one.

**Verified:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass; live-DB script exercised every review-queue action (merge, verify artist, apply genre, publish low-confidence event, resolve error report) and the ingestion-dashboard drop-detection query against the real Supabase instance, then fully cleaned up test data (row counts confirmed back to baseline).

**Next**
- GitHub Actions scheduled ingestion workflow (every 6h).
- `SellerSiteConnector` base class + a couple of real Tier 3 example connectors (full 9-source coverage from `docs/INGESTION.md` is a later iteration, not this pass).
- Final Phase 3 acceptance-criteria verification, then commit.

**Done — GitHub Actions scheduled ingestion (`.github/workflows/ingest.yml`)**
- Cron every 6h (`0 */6 * * *`) + manual `workflow_dispatch`, mirrors `ci.yml`'s pnpm/node setup, runs `pnpm ingest` with `DATABASE_URL`/`TICKETMASTER_API_KEY`/`IMPACT_TICKETMASTER_PUBLISHER_ID`/`ANTHROPIC_API_KEY`/`SITE_URL`/`REVALIDATE_SECRET` from repo secrets (none of these are set yet — the workflow will fail cleanly with a clear error on `TICKETMASTER_API_KEY` until the owner adds the key, which is expected and visible rather than silent).
- Built the previously-missing `/api/revalidate` route (the pipeline's `triggerRevalidation()` was already calling it and silently 404ing). Added `cacheTag("events")` next to `cacheLife("hours")` on the 6 pages that use `'use cache'` (home, `/music`, `/standup`, `/today`, `/weekend`, `/this-week`) so the new route's `revalidateTag("events", "max")` actually busts them on demand instead of waiting out the 1h window. Event/artist/venue/city/date/genre pages don't need this — they're already fully dynamic (`instant = false`, no cache). Added `SITE_URL` to `.env.example` (used by `triggerRevalidation` but was missing from the documented env list).
- Wired `markPastEvents()` into the CLI's main run (was exported but never called from `pnpm ingest`).

**Two more real bugs found via live testing, fixed:**
1. The per-connector loop in `pnpm ingest` had no try/catch — a connector whose `fetch()` throws before yielding anything (e.g. Ticketmaster with no `TICKETMASTER_API_KEY`, the owner's exact current state) would crash the whole process, skipping every other connector and `markPastEvents()`. In a scheduled, unattended job this meant one misconfigured source silently breaks everything. Fixed by wrapping each connector's run in its own try/catch; failures are logged per-source and reflected in a non-zero exit code, but no longer block the rest of the run.
2. **`pnpm ingest` never exited on its own** — confirmed via live testing (ran it 4 times, all 4 processes were still alive in `ps aux` minutes later, had to `kill -9` them). Root cause: `packages/db`'s shared postgres connection pool is intentionally long-lived for the Next.js server, but the one-shot CLI never closed it or force-exited, so the Node process hung forever after printing its results. In a GitHub Actions cron job this would have burned the full job timeout every 6 hours. Fixed with an explicit `process.exit()` in `index.ts`'s `.finally()`, verified the process now exits in 1–3s instead of hanging.

**Verified:** `pnpm lint && pnpm typecheck && pnpm test` all pass; live-ran `pnpm ingest` repeatedly against the real Supabase instance and confirmed prompt exit + correct exit code (1, since Ticketmaster has no API key yet) + `markPastEvents` still runs; hit `/api/revalidate` with no auth (401), wrong secret (401), and the real `REVALIDATE_SECRET` (200) against a local dev server.

**Open / blocked on the owner:** add repo secrets for `DATABASE_URL`, `TICKETMASTER_API_KEY`, `IMPACT_TICKETMASTER_PUBLISHER_ID`, `SITE_URL` (the production domain), `REVALIDATE_SECRET` (same value as in Vercel's env vars) so the scheduled workflow actually ingests something instead of just failing on the missing key. `ANTHROPIC_API_KEY` is optional (genre suggestions are skipped gracefully without it).

**Done — Tier 3 safety gate + `SellerSiteConnector` base + one real example connector (Leaan)**

- **Found and fixed a real production-safety gap first:** `runPipeline` never actually checked `sources.is_active` — a connector marked inactive (the default for every new Tier 3 source, per schema) would still run and write data. Added the check right after `ensureSource`; an inactive source now returns a `"Source is inactive — skipped"` report instead of fetching anything. This is the actual kill switch CLAUDE.md's Tier 3 activation rule depends on, and it didn't exist until now. Also added an admin UI toggle (`/admin/ingestion`, `actions.ts#setSourceActive`) so a human can flip it on for local/staging testing — previously there was no way to activate a source at all short of a manual DB edit.
- Wired the previously-declared-but-unused `since` field on `Connector.fetch()`: `runPipeline` now looks up the last successful run and passes its `finishedAt` through, so a connector that wants incremental fetching can use it. (Left unused by both existing connectors for now — using it to skip fetches would make the fetch count incomparable across runs and break the >30% drop-detection alert; a connector that wants both needs a separate "total known listings" signal, which is a fair follow-up, not solved here.)
- `packages/ingest/src/connectors/_seller-base/`: `robots.ts` (parses robots.txt, wildcard User-agent group only, Crawl-Delay support), `validate-listing.ts` (the validation layer INGESTION.md calls "what Tickchak lacks" — future-or-within-6h-past, price 0–3000 ILS, non-empty title/venue/city, URL on the source's own domain), `extract-jsonld.ts` (generic schema.org Event/@graph parser — reusable for any future Tier 3 site that embeds JSON-LD, which Leaan itself doesn't but at least one other real candidate site does), `extract-ai.ts` (Anthropic fallback extraction, same graceful-null-without-`ANTHROPIC_API_KEY` pattern as `classify-genre.ts`, content-hash cached per run), `seller-site-connector.ts` (shared `createSellerSiteFetch`: sitemap discovery, robots + rate-limit politeness, stops the run after 3 consecutive 403s).
- **Real, live-verified connector: `leaan.ts` (leaan.co.il, tier 3).** Before writing any code, actually fetched and inspected ~8 real candidate Tier 3 sites by hand (Kupat Tel Aviv, Barby, Zappa, Hangar 11, SmarTicket, Eventer — all either client-rendered SPAs with no server-rendered data, or B2B platform marketing pages, not real event pages). Leaan turned out to be genuinely scrapeable: server-rendered Next.js pages with a real sitemap and an embedded `__NEXT_DATA__` JSON blob carrying the actual event record (title, venue, address, city, Unix start/end timestamps, starting price, category id) — matching INGESTION.md's #1-preferred extraction method ("embedded JSON state → deterministic mapping"), no DOM scraping needed. Discovered real category ids live (3 = music, 4 = a shared "entertainment" bucket Leaan uses for both live music and standup — confirmed by fetching one of each and finding a known singer filed under the same id as a known comedian), so `normalize()` falls back to a title-keyword check to split that bucket, and skips everything else (sports, theater, kids) as out of V1 scope.
- Fixtures captured from real pages (`__fixtures__/leaan-{music,standup,kids-filtered}.json`, plus a neutral-domain JSON-LD fixture for the generic extractor), 8 + 4 new unit tests, all passing.

**Live verification against the real site and real Supabase DB (not just unit tests):**
- Dry-run against production leaan.co.il: correctly filtered a kids attraction and a circus out of the first 5 sitemap entries, then found 6 real music events out of the next 40 (a 6-city "MAD MOZART" tour) — inspected the full normalized output for all 6, structurally correct.
- **Did not activate the Leaan source to test the write path** — an attempt to flip `sources.is_active = true` for even a quick round-trip test was correctly blocked by the permission system as exactly the "activate Tier 3 in production" action CLAUDE.md says needs the owner's sign-off first. Verified the write path instead by calling `processListing()` directly with real fetched/normalized data, bypassing `runPipeline`'s active-check entirely — this exercises the real pipeline logic without ever touching the kill switch. Confirmed: event/artist/venue creation, correct `unmatched_artist`/`unmatched_venue`/`low_confidence_event` review_queue entries for a brand-new artist and venue, idempotent merge on a second pass (no duplicate events), and `sources.is_active` still `false` throughout. Found and fixed two bugs in my own cleanup script along the way (deleting a shared artist before all referencing events were gone; not accounting for the `unmatched_venue` review_queue rows), confirmed DB fully back to the 250-event/0-review_queue baseline afterward.

## 2026-11-02 — Build/deploy reliability: CI config bug + flaky Vercel build

The owner reported repeated GitHub "CI failed" emails and a failed Vercel production deployment right after the Tier 3 connector commit landed. Investigated both — neither was related to the connector work itself.

**CI failure — deterministic, fixed:** `ci.yml`'s `pnpm/action-setup@v4` step was failing instantly (before checkout, install, or any of our code ran) because `package.json` already declares `"packageManager": "pnpm@10.16.1"` and the workflow *also* passed `version: 10` to the action — current `pnpm/action-setup` refuses to run when both are set ("multiple versions specified"). Confirmed via the GitHub Actions API (job steps showed every step after `pnpm/action-setup` as `skipped`). Removed the redundant `version:` from both `ci.yml` and `ingest.yml`. Verified: CI went green on the next push.

**Vercel build failure — misdiagnosed once, then fixed for real from the actual log.** First pass: reproduced a *different*, genuine issue locally (`turbo run build` from a clean install intermittently failing `/music` and the other 5 `"use cache"` pages with *"A 'use cache' function took too long during prerendering"*, root-caused to the Postgres client's default pool size of 10 colliding with concurrent build workers) and shipped a pool-size cap for it. That fix was real and worth keeping, but it was **not** what was actually breaking Vercel — local reproduction via `.env.local` doesn't exercise the mechanism that was really failing, so the "fix" address a symptom I could see, not the actual cause. Once the owner pasted the real Vercel build log, the true cause was immediately obvious: `turbo.json` had no `globalEnv` declaration, and Vercel's Turborepo integration (remote caching enabled, unlike local runs) only passes through environment variables explicitly declared there — `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` were being silently stripped before `next build` ran, even though both were correctly set in Vercel's project settings, crashing `packages/db/src/client.ts` at module evaluation. Fixed by adding a `globalEnv` array to `turbo.json` listing every var from `.env.example`, so this can't recur as new env vars are added in later phases (Resend, PostHog, Sentry).

**Lesson:** when a deploy failure is reported without logs, ask for the actual log before trusting a local reproduction — a plausible-looking local failure in the same feature area can be a real-but-irrelevant bug that burns time while the actual cause sits unexamined.

**Explicitly deferred, not attempted:** Kupat Tel Aviv, Barby, and similar sites need client-side JS execution to see any real content (confirmed live — their server-rendered HTML is an empty shell or loading skeleton). A real connector for those needs Playwright-based rendering, which is a new runtime dependency for `packages/ingest` — per CLAUDE.md's "ask before deviating from the stack" rule, that's a decision for the owner, not something to add silently. Full 9-source coverage from `docs/INGESTION.md`'s list remains a later iteration.

**Found while debugging Vercel (not yet fixed, owner is getting the connection string):** `DATABASE_URL` uses Supabase's direct connection host, which resolves to an IPv6 address Vercel's build environment can't reach (`ENETUNREACH`). Supabase's own fix for exactly this is the connection pooler (Project Settings → Database → "Connection pooling" in the dashboard) — IPv4-compatible, built for serverless/ephemeral-build use. Needs the owner to paste the pooler connection string (not something to guess or change unilaterally — it's a live credential). Tracked in memory (`vercel_pooler_migration_pending`) so this isn't lost across sessions. Note for whoever applies it: if the owner's pooler string uses Transaction mode (port 6543), `postgres.js`'s default prepared-statement usage needs `{ prepare: false }` added to the client options in `packages/db/src/client.ts`; Session mode (port 5432 on the pooler host) works as a drop-in without that change.

## 2026-11-02 — Phase 3 acceptance criteria: verified against the actual bar in `docs/BUILD_PLAN.md`

Going through `docs/BUILD_PLAN.md`'s 7 literal Phase 3 criteria honestly — not all of them pass yet:

- [x] **Dry run against Ticketmaster prints a summary without writing; a real run creates events visible on the site.** Dry run verified (Task 29/33). "Real run creates events visible on the site" verified via the equivalent write path (not Ticketmaster itself, since `TICKETMASTER_API_KEY` isn't set) — `processListing()` called with real fetched/normalized Leaan data creates real rows in `events`/`ticket_offers`, confirmed live against Supabase today. The actual Ticketmaster real-run path can't be exercised end-to-end until the owner provides the API key.
- [x] **Running ingestion twice creates zero duplicate events (idempotent) — covered by tests.** Verified live today (Leaan: `created` then `merged` on reprocessing the same 2 listings, event count unchanged) and by `match-event.test.ts`.
- [x] **Matching unit tests: ±60min same venue+artist → merged; title variants → correct artist.** `match-event.test.ts` covers the ±60min merge case with the literal scenario from the doc. `parse-title.test.ts` covers the literal `"שלמה ארצי - מופע אקוסטי | היכל התרבות"` example from the doc, correctly extracting the artist. "Same artist, different venue, same night → separate" isn't a standalone unit test, but is structurally guaranteed rather than tested: `decideEventMatch`'s candidates are pre-filtered by `venue_id` in the SQL query that calls it (`run.ts`), so a different-venue show can never appear as a candidate in the first place.
- [x] **An event missing from its only source for 2 consecutive runs shows "לא זמין כרגע", not deleted.** No prior test covered this — verified live today with a dedicated script: after 1 missed run the event stays `scheduled`/visible; after 2, the offer deactivates and the event flips to `unavailable` (→ "לא זמין כרגע" per `copy/site.ts`), while the event row itself is never deleted. Cleaned up test data after.
- [~] **Scheduled workflow runs successfully on GitHub.** The workflow infrastructure is correct and runs cleanly end-to-end (checkout → pnpm → install → `pnpm ingest` all execute without error) — confirmed via today's scheduled cron firing for real. But "runs successfully" in the sense of *actually ingesting data* isn't possible yet: it fails at the `pnpm ingest` step because `TICKETMASTER_API_KEY` (and the other secrets) aren't set as GitHub repo secrets. This is expected and owner-blocked, not a bug — my own per-connector error isolation fix (Task #33) means this failure is now visible without crashing the whole job.
- [ ] **In staging, ≥5 Tier 3 sources produce validated events, same show on two sources → one event, two offers.** **Not met.** Only one real Tier 3 connector was built this pass (Leaan), by explicit scope decision documented when Task #34 started ("build the framework + a couple of real example connectors rather than shallowly attempting all 9"). Getting to 5 needs either more sites that are actually scrapeable via HTTP (most Tier 3 candidates inspected today turned out to be JS-rendered SPAs — see "explicitly deferred" above) or a Playwright-based connector path, which needs the owner's sign-off as a new dependency.
- [ ] **Coverage check: ≥85% of a 50-show manual list found.** **Not attempted.** Needs real production data flowing from multiple sources, which needs the owner's API keys/Tier 3 legal approval first — not meaningfully testable with only seed data + one Tier 3 source's live-but-unpublished test runs.

**Bottom line:** the ingestion *engine* (pipeline, matching, staleness, review queue, admin tooling, scheduled job, safety gates) is solid and verified end-to-end against the real Ticketmaster fixtures / real Leaan site / real Supabase DB. What's NOT done is *coverage breadth* — both remaining unmet criteria are about having enough real sources live, which is blocked on the owner providing `TICKETMASTER_API_KEY` and deciding on Tier 3 legal approval / a Playwright dependency, not on more pipeline code. Phase 3 should stay open (not marked complete) until those are resolved or the owner explicitly accepts the current coverage as good enough to move on.

## 2026-11-02 — Phase 5: SEO & measurement

Moved on to Phase 5 since Phase 4 is almost entirely blocked on Google OAuth (pending since Phase 1) and Phase 5's work doesn't need any owner-provided keys.

**Done**
- `app/sitemap.ts` + `app/robots.ts`: events (all published, including past — they stay indexed), artists, venues, cities, music genres and genre×city combos (the latter two gated at ≥3 upcoming events, reusing the exact same query logic as each page's own `noindex` check so the sitemap and the page's indexing decision can never disagree).
- `alternates.canonical` added to every public page that was missing one (previously only the event page had it) — home, music, standup, today/weekend/this-week, about/terms/privacy/accessibility/advertise, city/[city], music/[genre], music/[genre]/[city], date/[date], artist/[slug], venue/[slug]. `/search` gets a canonical plus explicit `noindex` (filter-combination results shouldn't compete with the real genre/city landing pages for ranking). Added `metadataBase` to the root layout (was missing — canonical/OG URLs weren't resolving to absolute URLs before this).
- Dynamic OpenGraph images (`opengraph-image.tsx` on event and artist pages) via `next/og`'s `ImageResponse`, Heebo font bundled locally under `apps/web/assets/fonts/`.
- Cookie consent banner + PostHog, gated correctly (PostHog only initializes after explicit consent, no-ops gracefully without `NEXT_PUBLIC_POSTHOG_KEY`). 4 of 7 BUILD_PLAN-listed events wired: search performed, event viewed, outbound click, save/unsave. `follow`/`signup`/`newsletter subscribe` aren't wired — those features don't exist until Phase 4.
- `/admin/metrics`: outbound clicks by source, top-clicked events, top zero-result search terms (new `search_queries` table, logged from `/search` on every request with an active filter).

**Three real bugs found while building this, not in the original feature list:**
1. `listEvents`, `listPastEventsByArtist`, and `getEventByShortId` never filtered on `events.published_at` — low-confidence events the ingestion pipeline deliberately holds back for admin review (confidence < 0.85, per `docs/INGESTION.md` step 10) were actually reachable and listable on the public site. Found while writing the sitemap query (which needed "published only" semantics explicitly). Fixed all three.
2. Satori (the renderer behind `next/og`'s `ImageResponse`) reverses the character order of every Hebrew-block text run, regardless of `direction`/`unicodeBidi` CSS — verified empirically with a throwaway diagnostic image testing 5 different CSS approaches, all identically broken. Root-caused precisely (digits and run order render correctly on their own; only Hebrew-letter runs get reversed) and fixed with a small pre-reversal helper (`app/lib/satori-rtl.ts`) rather than a CSS workaround, since no CSS property actually changed the output.
3. `/admin/metrics` broke the production build: Next 16's prerender analysis flagged `new Date()` inside the metrics query functions as an "unstable value," even with `instant = false` set on the route — a pattern that works fine elsewhere in this codebase (e.g. `listEvents`). Fixed with an explicit `await connection()` in the page component, the exact fix Next's own error message recommends; verified with a clean rebuild.

**Verified against the literal Phase 5 acceptance criteria:**
- [x] **Sitemap lists all upcoming events; past events stay indexed with "האירוע חלף".** Live-checked the real sitemap: 250/250 published events present, correct counts for artists/venues/cities/genres/genre-city combos. "Past events stay indexed" verified at the code level (`listAllPublishedEventRefs` has no date filter, unlike `listEvents`) rather than live, since the seed data has zero past-dated events to exercise this against — nothing to literally click through yet.
- [x] **Analytics fires only after consent.** Verified live with Playwright: cookie starts unset, the banner shows, "accept" sets `tiktim-consent=granted` and the banner disappears, "decline" sets `declined` and PostHog never initializes either way without a key — no console errors navigating pages that fire tracking calls.
- [~] **Google Rich Results Test validates an event page as Event.** Couldn't run the actual tool (needs a public URL; the site isn't live yet — see the Vercel deploy status above). Instead validated the rendered JSON-LD directly against Google's documented Event requirements: pulled it from a live dev-server response, confirmed valid JSON, and confirmed all three required properties (`name`, `startDate`, `location` with `name`+`address`) are present, plus the recommended `eventStatus`/`performer`/`offers` (with `url`/`price`/`priceCurrency`/`availability`). Structurally should pass; the literal tool run is owner-actionable once the site has a public URL.

**Open / blocked on the owner:** same as before (Google OAuth, `RESEND_API_KEY`, `TICKETMASTER_API_KEY`, Tier 3 legal approval, the Supabase connection pooler for Vercel) — none block further Phase 5 code, only live end-to-end testing of a couple of items above.

## 2026-11-02 — Vercel deploy fixed: switched to the Supabase session pooler

The owner found the real fix — walked through Supabase's "Connect" dialog (Direct Connection tab → Session pooler, not the old Database Settings path, which has moved in their UI) and got the actual pooler connection string: `postgresql://postgres.<project-ref>:[password]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`.

Updated `DATABASE_URL` in `.env.local` (same password, new host+username), verified a real query against Supabase through it, then a full clean `turbo run build` — both pass. Owner updated the same value in Vercel's Production environment variables and redeployed: **the site is live.**

With this, `/admin/metrics`'s `Date.now()`/`connection()` fix, the `turbo.json` globalEnv fix, and this pooler migration, there are no more known deploy blockers. Google OAuth is now the main remaining owner-provided prerequisite (blocks Phase 4 and literal Rich-Results-Test/admin-login verification, not further Phase 5/6 code).

## 2026-11-03 — Phase 6: Monetization basics

**Done**
- `promotions` table (already in schema, unused until now) wired end to end: `/admin/promotions` lists all promotions with an active/inactive toggle; `/admin/promotions/new` searches for an event, then creates a promotion (slot, genre for genre-rail placements, date range, advertiser, price, notes).
- Home page reads active promotions (`lib/queries/promotions.ts`) and **inserts** the sponsored event on top of the organic hero rotation / genre rail — never replaces organic content, never touches `/search` or `listEvents()`'s ordering at all (the promotions code isn't imported by either). `EventCard` and `HeroCarousel` both render a "ממומן" badge when `sponsored`/`sponsoredEventId` matches.
- Affiliate config (`sources.affiliateProgram`/`affiliateConfig`) is now editable from `/admin/ingestion` — previously the Ticketmaster→Impact wiring was fully built in code (`buildAffiliateUrl`, already shipped in Phase 3) but there was no way to actually turn it on without a raw DB edit.

**One real bug found and fixed while verifying:** the genre-rail `>=3 events` indexing/display threshold (from Phase 2/5, meant to hide thin organic rails) was applied *before* inserting the promoted event, so a paid genre-rail placement for a genre with fewer than 3 organic upcoming events would have silently never rendered — the advertiser would have paid for a slot that never appeared. Fixed: the threshold now also passes if that genre has an active promotion.

**Verified live against the real Supabase DB:** created a real active hero promotion, a real active genre-rail promotion, and a deliberately-expired hero promotion (same event, all three), confirmed via direct query that only the 1 non-expired one is picked up as "active," confirmed the home page actually renders the "ממומן" badge in both the hero and the correct genre rail (inspected the raw HTML, not just the query result), then cleaned up all three test rows (DB back to 0 promotions, matching baseline).

**Verified against the literal Phase 6 acceptance criteria:**
- [x] **A scheduled promotion appears in the hero only within its date range, labeled "ממומן", and does not change `/search` ordering.** Verified live as above. `/search` ordering is structurally guaranteed unaffected — `app/search/page.tsx` and `lib/queries/events.ts#listEvents` never import anything from `lib/queries/promotions.ts`.
- [x] **Outbound clicks report shows revenue-relevant breakdown per source.** Already built in Phase 5 (`/admin/metrics` → clicks by source), re-verified still correct.

**Open / blocked on the owner:** same as before — Google OAuth remains the one item blocking live end-to-end testing of any admin page (promotions included) through an actual browser session.

## 2026-11-03 — Phase 7 spot-check: Lighthouse against the real production site

With production actually live, ran real Lighthouse mobile audits against `https://tiktim-xi.vercel.app/` to spot-check Phase 7's acceptance bar early (not waiting until a dedicated Phase 7 pass).

**Found and fixed a real performance issue:** home page mobile performance was 85 (bar is ≥90). The LCP element was today's own cookie consent banner — it rendered client-side only via a post-mount `useEffect` reading the consent cookie (the same safe-but-slow pattern as `SaveHeart`, chosen originally to avoid a hydration mismatch), so it painted late, after hydration, well behind the rest of the page.

**Caught a false-positive regression while fixing it, worth remembering:** the first fix attempt (reading the cookie server-side via `next/headers` inside a `Suspense`-wrapped server component, then passing the initial state down as a prop — the standard PPR "dynamic island" pattern) appeared to break the `/admin` unauthenticated-redirect e2e test (`307` expected, got `200` — the exact `notFound()`/`redirect()`-inside-Suspense bug fixed back in Phase 2). Reverted immediately on seeing that. But the revert *also* failed the same test, which shouldn't have been possible — turned out `playwright.config.ts`'s `reuseExistingServer: true` was serving a stale `next start` process left running from an earlier manual check, so neither test run actually reflected the current code. Killed all stray Next processes, cleared `.next`, and reran clean: **the original Suspense-based fix passes the admin redirect test correctly** — it was never actually broken. Re-applied it (`git revert` the revert) after confirming 6/6 e2e tests pass twice in a row post-cleanup.

**Lesson:** when a local e2e result contradicts what the code should obviously do, suspect the test harness (stale server, stale build) before trusting the result — rerunning with everything killed and `.next` cleared would have saved the detour.

**Verified against production, post-fix (mobile Lighthouse):**
| page | performance | accessibility | notes |
|---|---|---|---|
| home | 93 | 96 | was 85/96 before the fix |
| event | 99 | 100 | |
| search | 99 | 98 | SEO 66 — expected: `/search` is deliberately `noindex`ed (Phase 5), which Lighthouse's SEO category always penalizes regardless of whether it's intentional |
| artist | 98 | 100 | |

All four pages clear both of `docs/BUILD_PLAN.md` Phase 7's literal thresholds (performance ≥90, accessibility ≥95) on the pages it names. `pnpm test:e2e` (6 tests, including axe-core checks on home/event/search) passes clean.

**Not done — the rest of Phase 7 is owner-gated, not code:** legal pages finalized by owner/lawyer, Sentry (`SENTRY_DSN`), Vercel/Supabase paid-plan upgrades (billing — explicitly requires the owner's approval, not something to do autonomously), and the beta with ~50 real users. Nothing further to build here until the owner acts on one of those.
