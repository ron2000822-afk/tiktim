# Build Plan — Tiktim

Eight phases. Each phase ends with something that runs and can be checked in a browser. **Do not start a phase until the previous phase's acceptance criteria pass.** Track progress in `docs/PROGRESS.md`.

Week estimates are rough and depend on the owner's available time.

---

## Phase 0 — Foundation (≈ week 1)

**Goal:** an empty but production-shaped project, deployed.

Tasks
- pnpm + Turborepo monorepo: `apps/web`, `packages/db`, `packages/ingest`, `packages/shared`.
- Next.js App Router, TypeScript strict, ESLint, Prettier, Tailwind, shadcn/ui initialized for RTL.
- `<html lang="he" dir="rtl">`, Heebo font, base layout (header, footer), design tokens from `docs/DESIGN.md` as CSS variables + Tailwind theme.
- Supabase project connected; Drizzle configured; first empty migration runs.
- Vitest + Playwright set up with one passing test each (Playwright includes an axe check).
- GitHub Actions CI: lint, typecheck, unit tests on every push.
- `.env.example`, `docs/PROGRESS.md`, command scripts listed in CLAUDE.md.
- Deploy to Vercel (Hobby is fine while non-commercial).

Acceptance criteria
- [ ] `pnpm dev` shows a Hebrew RTL home placeholder with header/footer.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` all pass locally and in CI.
- [ ] Preview URL on Vercel loads.

---

## Phase 1 — Data model, taxonomy, seed, admin skeleton (≈ weeks 2–3)

**Goal:** the database is real and full of realistic demo data.

Tasks
- Implement full schema from `docs/DATA_MODEL.md` with Drizzle, including enums, indexes, `pg_trgm` extension, and RLS policies for user tables.
- `packages/shared`: taxonomy from `docs/taxonomy.json`, Hebrew normalization (`normalizeHe`: strip niqqud, unify geresh/gershayim/quotes ״ " ׳ ' , collapse whitespace, lowercase Latin), slugify (transliterated Latin slugs for artists/venues/cities, e.g. `shlomo-artzi`).
- Seed script: regions, cities (~40 real Israeli cities), ~60 real venue names with coordinates, ~120 artists (mix of genres, Hebrew + English names, aliases), ~250 events over the next 4 months (realistic dates/times/prices), 1–3 ticket offers per event from fictional seller records named generically ("מוכר א׳"...) or from the sources table.
- `/admin` protected by Google login + `ADMIN_EMAILS` allowlist: list/search events, artists, venues; edit genre of an artist; mark event featured.

Acceptance criteria
- [ ] `pnpm db:migrate && pnpm db:seed` runs on a fresh DB with no errors and is idempotent.
- [ ] Unit tests for `normalizeHe` and `slugify` cover niqqud, gershayim, mixed Hebrew/English.
- [ ] Admin can log in, find an artist, change its genre, and see it persist.
- [ ] Non-admin Google account is denied `/admin`.

---

## Phase 2 — Browsing experience (≈ weeks 3–5)

**Goal:** the public site feels like a finished product on seed data. This phase decides whether the product wins — spend the time.

Tasks (see PRD sections "מבנה האתר ומסכים" and "חיפוש וסינון", and `docs/DESIGN.md`)
- Home page in the exact section order from the PRD: header with search bar (What / When / Where), hero carousel (featured; "ממומן" label when from `promotions`), quick chips, "חם עכשיו", "הסופ״ש הקרוב", "חדש בלוח", genre rails (horizontal scroll, keyboard accessible), "הופעות חו״ל בישראל", "כרטיסים אחרונים", cities grid, newsletter signup block (UI only for now).
- Event card component (image or designed fallback, artist, Hebrew day + date, city · venue, "מ-₪X", status badge, save heart).
- Pages: `/music`, `/standup`, `/music/[genre]`, `/music/[genre]/[city]`, `/city/[city]`, `/today`, `/weekend`, `/this-week`, `/date/[yyyy-mm-dd]`, `/event/[slug]-[id]`, `/artist/[slug]`, `/venue/[slug]`, `/search`.
- Event page: all elements listed in PRD (offers list with per-seller buttons → `/go/[offerId]`, Waze + Google Maps links, add-to-calendar `.ics`, WhatsApp share, more dates of same tour, similar events, "עודכן לפני X", disclaimer, "דווח על טעות" form → `error_reports`). Past event state.
- `/go/[offerId]` route: log `outbound_clicks`, 302 redirect.
- Search: autocomplete endpoint (artists, venues, cities, genres; trigram on normalized names; Hebrew + English aliases), filters (genre multi, price range, weekdays, venue type, outdoor, free, available only), sort (date default, popularity, price), grid + month calendar views, all state in URL query, smart empty state.
- Artist page extras (borrowed from Tickchak LIVE, done better): follower count, all upcoming dates, past shows, licensed photo with credit, social links; holiday/season tags as quick chips when relevant (e.g. "#חנוכה").
- Static pages: `/about`, `/terms`, `/privacy`, `/accessibility`, `/advertise` (contact form → email to owner).
- Loading skeletons, error boundaries, 404 page in Hebrew.

Acceptance criteria
- [ ] On a mobile viewport (390px) a user can find "rock shows this weekend in Tel Aviv area" from the home page in ≤ 3 interactions.
- [ ] Searching "ארצי", "artzi", and "שלמה ארצי" all return the same artist first.
- [ ] Clicking a seller button creates an `outbound_clicks` row and lands on the seller URL.
- [ ] All listed pages render with seed data, have unique titles/meta, and pass axe with no serious/critical violations.
- [ ] Lighthouse mobile ≥ 90 performance and ≥ 95 accessibility on home, event, search.

---

## Phase 3 — Ingestion engine (≈ weeks 5–7)

**Goal:** real shows flow in automatically and stay fresh. Follow `docs/INGESTION.md` exactly.

Tasks
- Connector interface + registry; `pnpm ingest` CLI with `--source`, `--dry-run`, `--limit`.
- Pipeline stages: fetch → store raw (`raw_listings`) → normalize → resolve artist/venue → match/dedupe into `events` + `ticket_offers` → classify genre → publish/queue → staleness → run report (`ingestion_runs`).
- **Ticketmaster connector** (Discovery API, `countryCode=IL`, music + comedy segments), respecting 5,000 calls/day and rate limits; affiliate URL wrapping via Impact publisher ID when configured.
- **Manual connector**: admin "add event" form in `/admin` writes through the same pipeline (source = manual).
- **Producer submission form** (public, `/advertise/add-show`): goes to `review_queue`, published only after admin approval.
- AI-assisted genre suggestion for new artists (stored as suggestion, admin approves in review queue).
- Admin review queue UI: possible duplicates (merge/keep separate), unmatched artists (link to existing/create new), unmatched venues, genre suggestions, producer submissions, error reports.
- Admin ingestion dashboard: last run per source, counts, errors, alert banner when a source's count drops > 30% vs previous run.
- GitHub Actions scheduled workflow every 6h running `pnpm ingest`, then calling the on-demand revalidation endpoint.
- **Tier 3 seller-site connectors** (the core of coverage, modeled on Tickchak LIVE): build the shared `SellerSiteConnector` base (discovery, change detection, structured-data → selectors → AI extraction fallback, validation layer) and then connectors for every source in the INGESTION target list, in order. Each runs in local/staging; production activation waits for the owner to set `legal_approved_at`.
- Coverage report in admin: per source, number of upcoming events; plus a weekly "coverage check" list where the admin pastes 50 known upcoming shows and sees which are missing.

Acceptance criteria
- [ ] A dry run against Ticketmaster prints a summary without writing; a real run creates events visible on the site.
- [ ] Running ingestion twice in a row creates zero duplicate events (idempotent) — covered by tests.
- [ ] Matching unit tests: same venue+date+artist with ±60 min different time → merged; same artist different venue same night → separate; title variants ("שלמה ארצי - מופע אקוסטי | היכל התרבות") → correct artist.
- [ ] An event missing from its only source for 2 consecutive runs shows as "לא זמין כרגע", not deleted.
- [ ] Scheduled workflow runs successfully on GitHub.
- [ ] In staging, at least 5 Tier 3 sources produce validated events, and the same show sold on two sources appears as one event with two offers.
- [ ] Coverage check: ≥ 85% of a 50-show manual list of upcoming music/stand-up shows is found.

---

## Phase 4 — Accounts, follows, alerts, newsletter (≈ weeks 7–8)

Tasks
- Google sign-in (Supabase Auth). Login prompt appears only when the user tries a personal action (follow/save/alerts).
- Anonymous saves stored in localStorage (wrapped in try/catch) and merged into the account on login.
- 3-step onboarding after first login (genres, home region, favorite artists — skippable).
- Follow buttons on artist, genre, city, venue pages. `/me`: followed items, saved events, notification preferences, delete account.
- "בשבילך" rail on home for logged-in users.
- Emails (React Email, Hebrew RTL templates): new show by followed artist (instant or daily digest per preference), saved-event reminder (7 days and 1 day before), status change on saved event (postponed/cancelled/few left), weekly "מה יש בסופ״ש" every Wednesday morning personalized by genres + region with one clearly labeled sponsored slot.
- Email-only newsletter signup with double opt-in; one-click unsubscribe (List-Unsubscribe header); `notifications_log` prevents duplicates.
- Email jobs run from GitHub Actions schedules (or Vercel Cron on Pro).

Acceptance criteria
- [ ] Following an artist, then ingesting a new event for that artist, results in exactly one alert email.
- [ ] Unsubscribe link works without login and is honored immediately.
- [ ] Deleting an account removes profile, follows, saves, subscriptions.
- [ ] RLS tests: a user cannot read another user's follows/saves.

---

## Phase 5 — SEO & measurement (≈ weeks 8–9)

Tasks
- `schema.org/Event` JSON-LD on event pages (name, startDate, location with address, offers with price/availability/url, performer, eventStatus).
- Sitemaps split by type (events, artists, venues, landing combos), `robots.txt`, canonical URLs.
- Programmatic landing pages genre × city × time; `noindex` when fewer than 3 upcoming events.
- Dynamic OpenGraph images for event and artist pages (Hebrew, RTL-correct).
- PostHog events: search performed (with filters), event viewed, outbound click, follow, save, signup, newsletter subscribe. Cookie consent banner gating analytics.
- Admin metrics page: outbound clicks by day/source/event, top searched terms with zero results (coverage gaps).

Acceptance criteria
- [ ] Google Rich Results Test validates an event page as Event.
- [ ] Sitemap lists all upcoming events; past events stay indexed with "האירוע חלף".
- [ ] Analytics fires only after consent.

---

## Phase 6 — Monetization basics (≈ week 9)

Tasks
- `/admin/promotions`: create promotion (event, slot: hero / genre-rail-top / newsletter, start/end, advertiser, price). Active promotions render with "ממומן" label.
- Affiliate link builder per source (Ticketmaster via Impact; generic template for future partners).
- Footer + about: commission disclosure.

Acceptance criteria
- [ ] A scheduled promotion appears in the hero only within its date range, labeled "ממומן", and does not change `/search` ordering.
- [ ] Outbound clicks report shows revenue-relevant breakdown per source.

---

## Phase 7 — Launch readiness (≈ week 10)

Tasks
- Full accessibility pass (keyboard-only walkthrough, screen reader smoke test with NVDA/VoiceOver), publish accessibility statement.
- Legal pages finalized by owner/lawyer; privacy policy; terms.
- Performance pass, image optimization, caching headers, error monitoring live (Sentry).
- Upgrade hosting to commercial plans (Vercel Pro, Supabase Pro) — owner action.
- Beta with ~50 users; feedback form; fix list.

Acceptance criteria
- [ ] Lighthouse mobile ≥ 90 / accessibility ≥ 95 on home, event, search, artist.
- [ ] Zero serious/critical axe violations site-wide in e2e.
- [ ] Owner sign-off.
