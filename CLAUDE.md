# CLAUDE.md — Tiktim (טיקטים)

Read this file fully before every task. It is the source of truth for how this project is built.

## What we are building

Tiktim is a **neutral show-discovery website for Israel**. It aggregates live shows from every ticket seller into one place with a Booking.com-grade search experience and Netflix-style browsing, then sends the user to the seller's site to buy. **We never sell tickets.**

- V1 scope: **Music + Stand-up only.** Hebrew only. Responsive web only (no native apps).
- Browsing never requires login. Optional **Sign in with Google** unlocks: follow artists/genres/cities/venues, saved events, email alerts, personalized weekly newsletter.
- Revenue: affiliate commissions on outbound ticket clicks, paid promoted placements (always labeled "ממומן"), later ads and newsletter sponsorship.

Full product spec (Hebrew): `docs/PRD.md`. Build order and acceptance criteria: `docs/BUILD_PLAN.md`. Schema: `docs/DATA_MODEL.md`. Data pipeline: `docs/INGESTION.md`. Visual direction: `docs/DESIGN.md`. Taxonomy seed: `docs/taxonomy.json`.

When the PRD and these English docs disagree, ask the owner (Ron) before choosing.

## How to work in this repo

1. **Follow `docs/BUILD_PLAN.md` phase by phase.** Do not start a phase before the previous one meets its acceptance criteria. At the start of a session, check `docs/PROGRESS.md` (create it if missing) and continue from there.
2. **Small, verifiable steps.** After each meaningful change: typecheck, lint, run tests. Do not report a task done until it runs.
3. **Update `docs/PROGRESS.md`** at the end of every session: what was done, what's next, open questions, decisions made (with date).
4. **Ask before**: adding a paid service, activating a Tier 3 connector in production (see Data rules), changing the schema in a way that drops data, or deviating from the stack below.
5. **Owner preference: build the whole product end to end.** Work through all phases continuously; stop only when you need something only the owner can provide (accounts, API keys, legal sign-off, design decisions with real trade-offs). The owner reviews and asks for fixes after.
6. Commit in small logical commits with clear messages.

## Stack (do not change without asking)

- **Monorepo** with pnpm workspaces + Turborepo:
  - `apps/web` — Next.js (App Router, latest stable), TypeScript strict, React Server Components. Public site + `/admin`.
  - `packages/db` — Drizzle ORM schema, migrations, seed scripts. Postgres on **Supabase**.
  - `packages/ingest` — data connectors + pipeline (Node/TypeScript), runs on a schedule via **GitHub Actions** (every 6h) and can run locally.
  - `packages/shared` — taxonomy, Hebrew text normalization, date helpers, types, zod schemas.
- **Styling**: Tailwind CSS + shadcn/ui. Full RTL. Hebrew font: Heebo (or Rubik) via `next/font`.
- **Auth**: Supabase Auth, Google provider only. Row Level Security on all user tables.
- **Search**: Postgres full-text + `pg_trgm` similarity on normalized names. No external search service in V1.
- **Email**: Resend + React Email.
- **Analytics**: PostHog. **Errors**: Sentry.
- **AI classification** (genre suggestions, ambiguous name matching): Anthropic API, small/cheap model, called only from `packages/ingest`, results always reviewable by an admin.
- **Hosting**: Vercel. Rendering: ISR for event/artist/venue/category/city pages (revalidate 1h + on-demand revalidation after each ingestion run). Search and `/me` are dynamic.
- **Tests**: Vitest (unit), Playwright (e2e).

## Non-negotiable rules

### Hebrew & RTL
- `<html lang="he" dir="rtl">`. Use Tailwind logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`), never `ml-/mr-/left-/right-` for layout.
- Icons that imply direction (arrows, chevrons) must be mirrored in RTL.
- All user-facing copy is Hebrew. Keep copy in one place per feature (simple constants module), not scattered literals, so English can be added later. Code, identifiers, commits and comments are English.
- Dates/times: store `timestamptz` in UTC, display in `Asia/Jerusalem` with Hebrew formatting (`Intl.DateTimeFormat('he-IL')`). Show day names ("יום חמישי"). "סופ״ש" = Thursday 00:00 → Saturday 23:59.
- Prices in ₪ with `Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' })`.

### Accessibility (legal requirement in Israel — IS 5568 / WCAG AA)
- Target WCAG 2.1 AA. Semantic HTML, labeled controls, visible focus, keyboard navigation for carousels/date pickers/menus, color contrast ≥ 4.5:1, `prefers-reduced-motion` respected, alt text on images.
- No accessibility overlay widgets. An accessibility statement page at `/accessibility`.
- Run axe checks in Playwright e2e on key pages.

### Data rules
- **Coverage goal: every show in Israel from every major seller.** The reference model is Tickchak LIVE (live.tickchak.co.il), which aggregates from all sellers (including Ticketmaster and Kupat Tel Aviv) using automated reading + AI extraction. We use the same approach and beat it on accuracy, neutrality, multi-seller comparison and experience.
- **Facts only from third parties**: artist, date/time, venue, price range, availability, URL. Never copy descriptions or images from a seller site unless the source license explicitly allows it (e.g. Ticketmaster Discovery API images under their terms). Artist images: Wikimedia Commons with license + photographer credit.
- **Source tiers** (see `docs/INGESTION.md`): Tier 1 official APIs, Tier 2 partner feeds, Tier 3 seller-site readers with AI extraction (**core of coverage — build them all in Phase 3; they run freely in local/staging, and are switched on in production once the owner sets `legal_approved_at` after a lawyer meeting held in parallel**), Tier 4 manual/admin entry and producer submissions.
- Every connector: respects robots.txt and rate limits, identifies itself with a clear User-Agent, can be disabled by a single flag, and honors removal requests.
- Never delete an event because it disappeared from a source; mark it and let the pipeline decide (see INGESTION).
- Every event page shows "עודכן לפני X" and a short disclaimer that final details are on the seller's site.

### Monetization integrity
- Promoted placements must always render a visible "ממומן" label and must never alter organic search result ranking.
- All outbound purchase links go through `/go/[offerId]`, which logs a row in `outbound_clicks` and 302-redirects to the affiliate URL (or plain URL if none). Never link directly to sellers from UI.
- Site footer/about page discloses that we may earn commission.

### Privacy & email
- Collect the minimum. Analytics cookies only after consent (simple banner). Privacy policy at `/privacy`.
- Newsletter/alerts: explicit opt-in, double opt-in for email-only signups, one-click unsubscribe in every email, store `consent_source` and timestamps (Israeli anti-spam law, Communications Law §30A).
- Users can delete their account and all data from `/me`.

### Quality bar
- This is a product meant to compete on experience. Mobile-first, fast (Lighthouse mobile ≥ 90 on home, event, and search pages), polished empty/loading/error states, skeletons instead of spinners.
- No placeholder "lorem ipsum" in shipped UI. Seed data must be realistic Hebrew (real-looking but fictional where needed).
- SEO on every public page: unique `<title>`/meta description, canonical URL, OpenGraph image, `schema.org/Event` JSON-LD on event pages.

## Commands (set these up in Phase 0 and keep this list current)

```
pnpm dev            # run web app
pnpm build
pnpm lint
pnpm typecheck
pnpm test           # vitest
pnpm test:e2e       # playwright
pnpm db:generate    # drizzle migrations
pnpm db:migrate
pnpm db:seed        # realistic demo data
pnpm ingest         # run all enabled connectors once, locally
pnpm ingest -- --source=ticketmaster --dry-run
```

## Environment variables

Keep `.env.example` complete and commented. Never commit secrets. Expected keys (add as phases need them):
`APP_ENV` (local | staging | production), `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TICKETMASTER_API_KEY`, `IMPACT_TICKETMASTER_PUBLISHER_ID`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `SENTRY_DSN`, `REVALIDATE_SECRET`, `ADMIN_EMAILS` (comma-separated allowlist for /admin).
