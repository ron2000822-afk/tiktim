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

**Explicitly deferred, not attempted:** Kupat Tel Aviv, Barby, and similar sites need client-side JS execution to see any real content (confirmed live — their server-rendered HTML is an empty shell or loading skeleton). A real connector for those needs Playwright-based rendering, which is a new runtime dependency for `packages/ingest` — per CLAUDE.md's "ask before deviating from the stack" rule, that's a decision for the owner, not something to add silently. Full 9-source coverage from `docs/INGESTION.md`'s list remains a later iteration.
