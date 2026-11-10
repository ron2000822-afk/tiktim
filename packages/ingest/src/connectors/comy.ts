import { getJerusalemYMD, zonedTimeToUtc } from "@tiktim/shared";
import { CITIES } from "@tiktim/db/seed-data";
import { RateLimiter, fetchWithRetry } from "../lib/http";
import type { Connector, NormalizedListing, RawItem } from "./types";
import { isAllowedByRobots, getCrawlDelayMs } from "./_seller-base/robots";
import { validateListing } from "./_seller-base/validate-listing";
import { decodeHtmlEntities } from "./_seller-base/decode-html-entities";

const ORIGIN = "https://comy.co.il";
const SOURCE_DOMAIN = "comy.co.il";
const SITEMAP_URL = `${ORIGIN}/event-sitemap.xml`;
const DEFAULT_INTERVAL_MS = 2500;
const MAX_CONSECUTIVE_FORBIDDEN = 3;

// comy.co.il is a single-purpose stand-up comedy ticket site — every
// listing is "standup", confirmed by its own branding ("כרטיסים למופעי
// סטנדאפ - קומי").
const CATEGORY_HINT = "standup" as const;

const HEBREW_WEEKDAY_TO_JS_DAY: Record<string, number> = {
  א: 0,
  ב: 1,
  ג: 2,
  ד: 3,
  ה: 4,
  ו: 5,
  ש: 6,
};

export type ComyPerformance = {
  artistName: string;
  venueName: string;
  day: number;
  month: number;
  hour: number;
  minute: number;
  weekdayLetter: string;
  url: string;
};

/** comy.co.il is one page per artist/show, listing every upcoming performance date on that page — unlike the 1:1 "page = event" shape every other connector assumes. */
export function discoverArtistPageUrls(sitemapXml: string): string[] {
  const urls: string[] = [];
  for (const match of sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = match[1].trim();
    let path: string;
    try {
      path = new URL(url).pathname;
    } catch {
      continue;
    }
    if (!/^\/event\/[^/]+\/$/.test(path)) continue; // skips the /event/ hub page itself
    urls.push(url);
  }
  return urls;
}

/**
 * Each upcoming date is a `<a class="single-page-event">` block; dates with
 * no real booking link (`href="#"`, sold out / past) are skipped. Date text
 * is day.month with no year — resolved later in normalize() using the
 * stated weekday as a cross-check.
 */
export function extractPerformances(html: string): ComyPerformance[] {
  const h1Match = /<h1[^>]*>([^<]*)<\/h1>/.exec(html);
  const artistName = h1Match ? decodeHtmlEntities(h1Match[1]).trim() : undefined;
  if (!artistName) return [];

  const results: ComyPerformance[] = [];
  const blockRegex = /<a\s+href="([^"]*)"\s+class="single-page-event[^"]*">([\s\S]*?)<\/a>/g;

  for (const match of html.matchAll(blockRegex)) {
    const href = match[1];
    if (!href.startsWith("http")) continue; // "#" = sold out / not bookable
    const inner = match[2];

    const dateMatch = /<div class="date\s*">\s*(?:<!--[\s\S]*?-->)?\s*<div>(\d{1,2})\.(\d{1,2})<\/div>/.exec(inner);
    const lightMatch = /<span class="single-light">([^<]+)<\/span>/.exec(inner);
    const placeMatch = /<div class="single-place-string"><p>([^<]*)<\/p><\/div>/.exec(inner);
    if (!dateMatch || !lightMatch || !placeMatch) continue;

    const timeMatch = /יום\s*([א-ת])'?\s*(\d{1,2}):(\d{2})/.exec(lightMatch[1]);
    if (!timeMatch) continue;

    results.push({
      artistName,
      venueName: decodeHtmlEntities(placeMatch[1]).trim(),
      day: Number(dateMatch[1]),
      month: Number(dateMatch[2]),
      weekdayLetter: timeMatch[1],
      hour: Number(timeMatch[2]),
      minute: Number(timeMatch[3]),
      url: href,
    });
  }
  return results;
}

function jsWeekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Resolves a year-less day/month into a full UTC instant by trying the
 * current Jerusalem year then next year, keeping only a candidate whose
 * weekday matches the page's own stated weekday and that isn't already in
 * the past — safer than guessing a year outright on a date-only source.
 */
export function resolveDate(day: number, month: number, hour: number, minute: number, expectedDow: number, now: Date): Date | null {
  const { year: nowYear } = getJerusalemYMD(now);
  const gracePeriodMs = 24 * 60 * 60 * 1000;

  for (const year of [nowYear, nowYear + 1]) {
    if (jsWeekdayOf(year, month, day) !== expectedDow) continue;
    const candidate = zonedTimeToUtc(year, month, day, hour, minute, 0);
    if (candidate.getTime() < now.getTime() - gracePeriodMs) continue;
    return candidate;
  }
  return null;
}

// Merged municipalities ("תל אביב-יפו", "מודיעין-מכבים-רעות") are almost
// always called by just their first segment colloquially — a venue saying
// plain "תל אביב" should still resolve, not just the full official name.
const CITY_NAME_CANDIDATES = Array.from(
  new Set(CITIES.flatMap((c) => (c.nameHe.includes("-") ? [c.nameHe, c.nameHe.split("-")[0]] : [c.nameHe]))),
).sort((a, b) => b.length - a.length);

/** Venue names here embed the city with no separate field (e.g. "היכל התרבות פתח תקווה") — best-effort substring match against our seeded city list; venues in towns we haven't seeded fall back to review via validateListing's missing-city rejection. */
export function guessCityFromVenueName(venueName: string): string | undefined {
  return CITY_NAME_CANDIDATES.find((cityName) => venueName.includes(cityName));
}

export const comyConnector: Connector = {
  slug: "comy",
  tier: 3,

  async *fetch(opts) {
    const origin = new URL(ORIGIN).origin;
    const sitemapPath = new URL(SITEMAP_URL).pathname;
    if (!(await isAllowedByRobots(origin, sitemapPath))) {
      throw new Error(`robots.txt disallows ${sitemapPath} on ${origin}`);
    }

    const crawlDelayMs = (await getCrawlDelayMs(origin)) ?? DEFAULT_INTERVAL_MS;
    const rateLimiter = new RateLimiter(crawlDelayMs);

    const sitemapResponse = await fetchWithRetry(SITEMAP_URL, { signal: opts.signal, rateLimiter });
    if (!sitemapResponse.ok) throw new Error(`Failed to fetch sitemap: HTTP ${sitemapResponse.status}`);
    const sitemapXml = await sitemapResponse.text();

    // `opts.since` is intentionally ignored: the sitemap's lastmod is per
    // artist page, not per performance, so it can't tell us which specific
    // dates are new — re-checking every page each run is the safer choice.
    const pageUrls = discoverArtistPageUrls(sitemapXml);

    let emitted = 0;
    let consecutiveForbidden = 0;

    for (const pageUrl of pageUrls) {
      if (opts.limit && emitted >= opts.limit) return;

      const pagePath = new URL(pageUrl).pathname;
      if (!(await isAllowedByRobots(origin, pagePath))) continue;

      const response = await fetchWithRetry(pageUrl, { signal: opts.signal, rateLimiter, maxRetries: 1 });
      if (response.status === 403) {
        consecutiveForbidden++;
        if (consecutiveForbidden >= MAX_CONSECUTIVE_FORBIDDEN) {
          throw new Error(`${MAX_CONSECUTIVE_FORBIDDEN} consecutive 403s from ${origin} — stopping this source's run`);
        }
        continue;
      }
      consecutiveForbidden = 0;
      if (!response.ok) continue;

      const html = await response.text();
      for (const perf of extractPerformances(html)) {
        if (opts.limit && emitted >= opts.limit) return;
        const prsntId = new URL(perf.url).searchParams.get("prsntId");
        if (!prsntId) continue;
        emitted++;
        yield { externalId: prsntId, payload: perf };
      }
    }
  },

  normalize(item: RawItem): NormalizedListing | null {
    const perf = item.payload as ComyPerformance;
    const expectedDow = HEBREW_WEEKDAY_TO_JS_DAY[perf.weekdayLetter];
    if (expectedDow === undefined) return null;

    const startsAt = resolveDate(perf.day, perf.month, perf.hour, perf.minute, expectedDow, new Date());
    if (!startsAt) return null;

    const listing: NormalizedListing = {
      sourceSlug: "comy",
      externalId: item.externalId,
      title: perf.artistName,
      artistNames: [perf.artistName],
      venueName: perf.venueName,
      cityName: guessCityFromVenueName(perf.venueName),
      startsAt: startsAt.toISOString(),
      categoryHint: CATEGORY_HINT,
      currency: "ILS",
      availability: "available",
      status: "scheduled",
      url: perf.url,
    };

    const validation = validateListing(listing, SOURCE_DOMAIN);
    if (!validation.valid) return null;

    return listing;
  },
};
