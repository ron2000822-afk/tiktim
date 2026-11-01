# Data Model — Tiktim

Postgres (Supabase) via Drizzle ORM. All ids are `uuid` (default `gen_random_uuid()`) unless noted. All tables have `created_at timestamptz default now()` and `updated_at timestamptz` (trigger). Timestamps stored in UTC.

Extensions: `pg_trgm`, `unaccent` (not effective for Hebrew niqqud — normalization is done in app code and stored in `*_norm` columns).

## Core concept

- **Event** = one performance: one date/time at one venue.
- **Ticket offer** = that event as sold by one source/seller. One event → many offers.
- **Artist** carries genres; events inherit them unless overridden.

## Enums

- `event_status`: `scheduled | few_left | sold_out | postponed | cancelled | unavailable | past`
  - `unavailable` = disappeared from all sources but date not passed (see INGESTION staleness).
- `availability`: `available | few_left | sold_out | unknown`
- `artist_role`: `headliner | support | lineup`
- `venue_type`: `club | hall | theater | amphitheater | arena | stadium | outdoor | bar | other`
- `source_kind`: `api | feed | scrape | manual | submission`
- `follow_target`: `artist | genre | city | venue`
- `review_kind`: `possible_duplicate | unmatched_artist | unmatched_venue | genre_suggestion | submission | error_report | low_confidence_event`
- `review_status`: `open | approved | rejected | merged`
- `promo_slot`: `hero | genre_rail_top | newsletter`
- `email_frequency`: `instant | daily | weekly | off`

## Taxonomy

### regions
`id, slug (unique), name_he, sort_order`

### cities
`id, slug (unique), name_he, name_en, aliases text[], region_id → regions, lat, lng`

### categories
`id, slug (unique) — 'music' | 'standup' (more later), name_he, is_active bool, sort_order`

### genres
`id, slug (unique), category_id → categories, name_he, sort_order, is_active`

Seed from `docs/taxonomy.json`.

## Catalog

### artists
| column | type | notes |
| --- | --- | --- |
| slug | text unique | transliterated |
| name_he | text | display name |
| name_en | text null | |
| name_norm | text | `normalizeHe(name_he)`; GIN trigram index |
| aliases | text[] | other spellings, Hebrew + English |
| aliases_norm | text[] | normalized aliases; GIN index |
| is_international | bool | foreign act touring Israel |
| image_url, image_credit, image_license | text null | only licensed images |
| bio_short | text null | written by us, never copied |
| popularity | int default 0 | derived from views/clicks |
| is_verified | bool | admin-confirmed record |

### artist_genres
`artist_id, genre_id, is_primary bool` — PK (artist_id, genre_id). Max 2 per artist (enforced in app).

### venues
`id, slug unique, name, name_norm (trgm), aliases text[], aliases_norm text[], city_id → cities, address, lat, lng, capacity int null, venue_type, is_outdoor bool, accessibility_notes text null, website text null`

### events
| column | type | notes |
| --- | --- | --- |
| slug | text | `{artist-or-title-slug}`; URL is `/event/{slug}-{shortId}` |
| short_id | text unique | 8-char base62, stable |
| title | text | display title (cleaned) |
| tour_name | text null | e.g. "מופע אקוסטי" |
| category_id | → categories | |
| venue_id | → venues | |
| starts_at | timestamptz | |
| doors_at | timestamptz null | |
| status | event_status | |
| min_price, max_price | numeric(10,2) null | aggregated from offers |
| currency | char(3) default 'ILS' | |
| image_url, image_credit | text null | licensed only |
| is_featured | bool | editorial pick (not paid) |
| tags | text[] | `international`, `festival`, `outdoor`, `free`, `english`, `accessible` |
| genre_override | uuid[] null | if set, replaces inherited genres |
| confidence | real | 0–1 from matching |
| first_seen_at, last_seen_at | timestamptz | |
| published_at | timestamptz null | null = hidden (in review) |

Indexes: `(starts_at)`, `(venue_id, starts_at)`, `(category_id, starts_at)`, `(status, starts_at)`, GIN on `tags`.

### event_artists
`event_id, artist_id, role artist_role, billing_order int` — PK (event_id, artist_id).

### ticket_offers
`id, event_id → events, source_id → sources, external_id text, url text, affiliate_url text null, price_min, price_max numeric null, availability, last_checked_at timestamptz, last_seen_at timestamptz, is_active bool` — unique (source_id, external_id).

## Ingestion

### sources
`id, slug unique, name_he, kind source_kind, tier smallint (1–4), base_url, affiliate_program text null, affiliate_config jsonb, is_active bool default false, schedule_cron text, legal_approved_at timestamptz null, notes text`

In production (`APP_ENV=production`), Tier 3 sources cannot be activated unless `legal_approved_at` is set (enforce in app). In local/staging they can run freely. Add `removed_at timestamptz null` for removal requests.

### raw_listings
`id, source_id, external_id, payload jsonb, payload_hash text, fetched_at, run_id → ingestion_runs, parse_status ('ok'|'error'|'skipped'), parse_error text null, matched_event_id → events null` — unique (source_id, external_id). Keep latest payload; history not required in V1.

### ingestion_runs
`id, source_id, started_at, finished_at, status ('running'|'success'|'partial'|'failed'), fetched int, created int, updated int, merged int, queued int, errors int, error_sample jsonb`

### review_queue
`id, kind review_kind, status review_status, payload jsonb, confidence real null, related_event_id null, related_artist_id null, created_by text ('pipeline'|'user'|'admin'), resolved_by uuid null, resolved_at null, resolution jsonb null`

## Users (Supabase Auth: `auth.users`)

### profiles
`user_id (PK, → auth.users), display_name, home_region_id null, onboarded_at null, is_admin bool default false`

### follows
`user_id, target_type follow_target, target_id uuid, created_at` — PK (user_id, target_type, target_id).

### saved_events
`user_id, event_id, created_at` — PK (user_id, event_id).

### email_subscriptions
`id, email citext unique, user_id null, genres uuid[], region_ids uuid[], newsletter_frequency email_frequency, alerts_frequency email_frequency, confirm_token text, confirmed_at null, unsubscribed_at null, consent_source text ('signup_form'|'onboarding'|...), consent_at timestamptz, unsubscribe_token text unique`

### notifications_log
`id, user_id null, email, kind ('new_show'|'reminder_7d'|'reminder_1d'|'status_change'|'newsletter'), event_id null, dedupe_key text unique, sent_at, provider_id text`

RLS: profiles/follows/saved_events readable and writable only by `auth.uid() = user_id`. email_subscriptions and notifications_log server-only (service role).

## Monetization & feedback

### outbound_clicks
`id, offer_id, event_id, source_id, session_id text, user_id null, page text, referrer text null, utm jsonb null, created_at` — index (created_at), (source_id, created_at). Server-only.

### promotions
`id, event_id, slot promo_slot, genre_id null (for genre_rail_top), starts_at, ends_at, advertiser text, price numeric null, notes, is_active bool` — active when now() between starts_at and ends_at and is_active.

### error_reports
`id, event_id, kind ('wrong_date'|'wrong_price'|'cancelled'|'wrong_venue'|'other'), message text, contact_email null, status ('open'|'fixed'|'dismissed'), created_at`

## Derived / views

- `event_genres_v`: effective genres per event (override or union of headliner artists' genres).
- `upcoming_events_v`: published, `starts_at > now()`, status not in (cancelled, past).
- Popularity job (daily): `artists.popularity` and a `hot_score` per event from last-7-days views + clicks (time-decayed). Store `hot_score` on `events` (add column `hot_score real default 0`).
