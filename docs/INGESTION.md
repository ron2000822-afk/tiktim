# Ingestion Engine — Tiktim

The data engine is the moat. It must be reliable, idempotent, observable, and legally clean.

## Source tiers

| Tier | What | Default | Activation rule |
| --- | --- | --- | --- |
| 1 | Official APIs (Ticketmaster Discovery API) | active | API key present |
| 2 | Partner feeds (CSV/JSON/XML from ticket companies under agreement) | inactive | agreement in place |
| 3 | Seller-site readers + AI extraction (the core of coverage) | active in local/staging; **inactive in production** | owner sets `legal_approved_at` (lawyer meeting runs in parallel to development) |
| 4 | Manual admin entry + producer submissions | active | always reviewed |

Reference model: Tickchak LIVE aggregates from all Israeli sellers, including Ticketmaster and Kupat Tel Aviv, by reading seller pages and extracting data with AI ("updated by AI from the original sales site", "collected automatically without verification"). We do the same, plus a verification layer they lack.

### Tier 3 target sources (build in this order)

1. Kupat Tel Aviv (kupat.co.il)
2. Leaan (leaan.co.il)
3. Zappa (zappa-club.co.il)
4. Eventim Israel
5. Tomix
6. Barby (barby.co.il)
7. Tickchak (tickchak.co.il) — also approach as a partner
8. Eventer, Smarticket, Go-Out, Tixwise
9. Large venues with their own box office (Heichal HaTarbut, Menora Mivtachim Arena, Caesarea Amphitheater, Hangar 11, regional culture halls)

Before writing each connector, inspect the site: prefer (a) official/undocumented JSON endpoints the site itself uses, (b) sitemap.xml + schema.org Event JSON-LD embedded in event pages, (c) server-rendered HTML, (d) Playwright only if the page requires JS. Many ticket sites embed JSON-LD — use it before AI.

## Connector interface (`packages/ingest/src/connectors/types.ts`)

```ts
export interface RawItem {
  externalId: string;          // stable id in the source
  payload: unknown;            // raw JSON as received
}

export interface NormalizedListing {
  sourceSlug: string;
  externalId: string;
  title: string;               // as shown by source
  artistNames: string[];       // best-effort extraction, headliner first
  tourName?: string;
  venueName: string;
  cityName?: string;
  address?: string;
  lat?: number; lng?: number;
  startsAt: string;            // ISO with offset, Asia/Jerusalem if source is local
  doorsAt?: string;
  categoryHint?: 'music' | 'standup' | 'other';
  genreHints?: string[];
  priceMin?: number; priceMax?: number; currency?: string;
  availability?: 'available' | 'few_left' | 'sold_out' | 'unknown';
  status?: 'scheduled' | 'postponed' | 'cancelled';
  url: string;
  imageUrl?: string;           // only if license allows
  imageCredit?: string;
}

export interface Connector {
  slug: string;
  tier: 1 | 2 | 3 | 4;
  fetch(opts: { since?: Date; limit?: number; signal: AbortSignal }): AsyncIterable<RawItem>;
  normalize(item: RawItem): NormalizedListing | null;   // null = skip (e.g. not music/standup)
  buildAffiliateUrl?(url: string, config: Record<string, unknown>): string;
}
```

Every connector has: fixture-based unit tests (saved real responses under `__fixtures__`), a rate limiter, retry with exponential backoff, a clear User-Agent (`TiktimBot/1.0 (+https://<domain>/about)`), robots.txt check (Tier 3), and an `AbortSignal` timeout.

## Pipeline (per run, per source)

1. **Start run** → insert `ingestion_runs` row.
2. **Fetch** → for each `RawItem`, upsert `raw_listings` by (source, externalId). If `payload_hash` unchanged and last run was successful, skip heavy processing but refresh `last_seen_at` on the offer.
3. **Normalize** → `NormalizedListing`; on throw, mark `parse_status=error`, continue.
4. **Filter** → keep only `music` / `standup` (V1). Unknown category → try artist lookup; still unknown → `review_queue` (`low_confidence_event`).
5. **Resolve venue** → match by normalized name + aliases + city (trigram ≥ 0.6 and same city, or exact alias). No match → create venue as unverified and queue `unmatched_venue`.
6. **Resolve artists** → see Artist matching. No confident match → create unverified artist + queue `unmatched_artist`.
7. **Match event** → see Event matching. Merge into existing event or create new one.
8. **Upsert offer** → unique (source, externalId); update price, availability, url, `last_seen_at`, `last_checked_at`; recompute event `min_price/max_price` and status from all active offers.
9. **Classify genre** → if headliner artist has no genres: ask AI for up to 2 genre slugs from the taxonomy (strict JSON output, validated with zod), store as `genre_suggestion` in review queue; event still published under category with no genre until approved.
10. **Publish** → `confidence ≥ 0.85` → `published_at = now()`; else hide and queue.
11. **Staleness** (end of run) → offers of this source not seen this run: increment miss counter (store in `ticket_offers` as `missed_runs int`). At `missed_runs ≥ 2` → `is_active=false`. If an event has no active offers and `starts_at > now()` → status `unavailable`. Never delete.
12. **Past events** → daily job sets `status='past'` for `starts_at < now() - 6h`. Pages stay live.
13. **Finish run** → counts, status, error sample. If `fetched` dropped > 30% vs previous successful run → mark `partial` and surface alert in admin.
14. **Revalidate** → call `/api/revalidate` with changed paths (event, artist, venue, affected listing pages).

All writes for one listing happen in a single transaction. The whole run is idempotent: running twice produces the same state.

## Hebrew normalization (`packages/shared/src/text.ts`)

`normalizeHe(s)`:
- Unicode NFKC; remove niqqud and cantillation (U+0591–U+05C7).
- Map ״ ” “ " → `"`; ׳ ’ ‘ ' → `'`; then remove both for matching keys.
- Replace dashes/pipes/slashes with space; remove punctuation except letters/digits/space.
- Lowercase Latin; collapse spaces; trim.
- Optional: final-letter folding (ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ) for matching keys only.

## Title parsing

Seller titles mix artist, tour and venue, e.g.:
- `שלמה ארצי - מופע אקוסטי | היכל התרבות`
- `עומר אדם בהופעה`
- `ערב סטנדאפ: שחר חסון, אדיר מילר ועוד`
- `TOOL – Live in Israel`

Rules (in order): strip venue name if present; split on ` - `, ` – `, `|`, `:`; drop generic words (`בהופעה`, `הופעה`, `מופע`, `במופע`, `לייב`, `live`, `in israel`, `סטנדאפ` when not the only word); split lineup on `,` / ` ו` / `&` / `ועוד`. Keep the rest as `tourName`. Cover with table-driven tests using real-world examples.

## Artist matching

Score candidates from `artists` by:
1. exact match on `name_norm` or any `aliases_norm` → 1.0
2. trigram similarity on normalized names → value (threshold 0.55 to be a candidate)
3. Hebrew↔English: if listing name is Latin, compare against `name_en` and Latin aliases.

Accept if best ≥ 0.9, or ≥ 0.75 and second-best is < best − 0.15. Otherwise, if `ANTHROPIC_API_KEY` is set, ask the model to pick among top 5 candidates or "none" (strict JSON), and accept only with admin review queued. Never auto-merge two existing artist records.

## Event matching (dedupe across sources)

Candidate events: same `venue_id`, `starts_at` within ±90 minutes, not cancelled.
Score = 0.5 × venue match + 0.3 × headliner artist match + 0.2 × time proximity.
- ≥ 0.85 → merge (add/update offer).
- 0.6–0.85 → create separate but queue `possible_duplicate` with both ids.
- Two shows same artist same venue same day at different times (e.g. 19:00 and 22:00, > 90 min apart) are **separate** events.

## Ticketmaster connector notes

- Discovery API v2, `countryCode=IL`, `classificationName` music and comedy, sorted by date, page size 200, respect deep-paging limit (`size × page < 1000`) by slicing date windows (e.g. month by month).
- Quota: default 5,000 calls/day; a run should use < 300 calls.
- Map `dates.status.code` → status; `priceRanges` → prices; `_embedded.venues[0]` → venue; `_embedded.attractions` → artists; images allowed per TM terms (pick 16:9, width ≥ 1024).
- Affiliate: wrap event URL with Impact tracking using `IMPACT_TICKETMASTER_PUBLISHER_ID` when set.

## Tier 3 connectors (seller sites)

Shared base class `SellerSiteConnector` in `connectors/_seller-base/`:

- **Discovery:** list event URLs from sitemap.xml, category/listing pages, or the site's own JSON API. Store `externalId` = canonical event URL or the site's event id.
- **Change detection:** fetch only new/changed URLs each run (compare `payload_hash` of the relevant page section); full re-crawl weekly.
- **Extraction, in order of preference:**
  1. Structured data on the page (schema.org `Event` JSON-LD, Open Graph, embedded JSON state) → deterministic mapping.
  2. Site-specific CSS/DOM selectors (fast, cheap, tested with fixtures).
  3. **AI extraction fallback:** send the cleaned main-content text (not full HTML, max ~6k tokens) to the Anthropic API with a strict JSON schema matching `NormalizedListing`; validate with zod; reject on schema failure. Cache by content hash so unchanged pages are never re-sent.
- **Validation layer (what Tickchak lacks):** every listing must pass: start time in the future (or within 6h past), parseable Israeli venue/city, price within 0–3,000 ₪, title non-empty, URL on the source domain. Cross-check against other sources for the same event (date/time disagreement > 30 min → review queue). Failing items go to `review_queue` (`low_confidence_event`), never straight to the site.
- **Politeness:** robots.txt respected, max 1 request / 2–3 seconds per domain, clear User-Agent, exponential backoff on 429/5xx, stop the run for that source on repeated 403 and alert admin.
- **Facts only:** store no descriptions or images from seller pages.
- **Kill switch:** `sources.is_active`; production requires `legal_approved_at`.
- **Removal requests:** admin action "remove source" deactivates it and hides its offers within one run.
- **Fixtures:** save 3–5 real sample pages per source under `__fixtures__` and test extraction against them; a fixture test failing in CI after a site redesign is expected and should produce a clear error.

## Observability

- Structured logs (JSON) per stage with run id.
- `/admin/ingestion`: table of sources (tier, active, last run status, fetched/created/updated/merged/queued/errors, duration), drill-down to run errors and sample raw payloads.
- Failing run → Sentry event.
