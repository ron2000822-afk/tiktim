import { RateLimiter, fetchWithRetry } from "../lib/http";
import type { Connector, NormalizedListing, RawItem } from "./types";
import { isAllowedByRobots } from "./_seller-base/robots";
import { validateListing } from "./_seller-base/validate-listing";
import { decodeHtmlEntities } from "./_seller-base/decode-html-entities";
import { openBrowserSession, fetchRenderedHtml } from "./_seller-base/browser-fetch";
import { guessCityFromVenueName } from "./_seller-base/guess-city";
import { resolveDate } from "./comy";

const ORIGIN = "https://www.to-mix.co.il";
const SOURCE_DOMAIN = "to-mix.co.il";
const SITEMAP_INDEX_URL = `${ORIGIN}/sitemap_index.xml`;
const DEFAULT_INTERVAL_MS = 2500;

// to-mix.co.il's product pages are fully client-rendered (confirmed live:
// raw HTML has zero price/date text even on individual product pages) —
// needs a real browser, same as barby. Its shop also sells plain
// merchandise alongside show tickets with no separate "type" field; a
// merch product simply has no date/time/place spans at all, which doubles
// as the scope filter (see extractShowDetails).
const STANDUP_KEYWORDS = ["סטנדאפ", "סטנד-אפ", "קומדי", "stand up", "standup"];

// The sitemap has 400+ product URLs spanning years, most long past or
// settled merchandise listings — rendering every one with a real browser
// each run isn't practical. Recent lastmod is a reasonable proxy for
// "currently on sale" (WooCommerce touches it on stock/date changes);
// older listings are accepted as a coverage gap, not silently claimed as complete.
const LASTMOD_WINDOW_DAYS = 45;

const FULL_WEEKDAY_TO_JS_DAY: Record<string, number> = {
  ראשון: 0,
  שני: 1,
  שלישי: 2,
  רביעי: 3,
  חמישי: 4,
  שישי: 5,
  שבת: 6,
};

export type TomixShowDetails = {
  title: string;
  weekdayName: string;
  day: number;
  month: number;
  hour: number;
  minute: number;
  venueName: string;
  url: string;
};

export function discoverProductSitemapUrls(sitemapIndexXml: string): string[] {
  const urls: string[] = [];
  for (const match of sitemapIndexXml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = match[1].trim();
    if (/\/product-sitemap\d*\.xml$/.test(url)) urls.push(url);
  }
  return urls;
}

export function discoverRecentProductUrls(productSitemapXml: string, now: Date): string[] {
  const cutoff = now.getTime() - LASTMOD_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const urls: string[] = [];
  for (const match of productSitemapXml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) {
    const [, url, lastmod] = match;
    const lastmodMs = new Date(lastmod).getTime();
    if (!Number.isNaN(lastmodMs) && lastmodMs >= cutoff) urls.push(url.trim());
  }
  return urls;
}

/** Returns null for anything without a date/time/place — merchandise products included in the same sitemap, not actual shows. */
export function extractShowDetails(html: string, url: string): TomixShowDetails | null {
  const titleMatch = /<h1 class="mix-main-title">([^<]*)<\/h1>/.exec(html);
  const dateMatch = /<span class="span-mixtempdate">([^<]*)<\/span>/.exec(html);
  const timeMatch = /<span class="span-mixtemptime">([^<]*)<\/span>/.exec(html);
  const placeMatch = /<span class="span-mixplace">\s*<a[^>]*>([^<]*)<\/a>/.exec(html);
  if (!titleMatch || !dateMatch || !timeMatch || !placeMatch) return null;

  const dateText = decodeHtmlEntities(dateMatch[1]).trim();
  const dayMonthMatch = /^(?:יום\s+)?([א-ת]+),\s*(\d{1,2})\.(\d{1,2})/.exec(dateText);
  const timeText = decodeHtmlEntities(timeMatch[1]).trim();
  const clockMatch = /^(\d{1,2}):(\d{2})/.exec(timeText);
  if (!dayMonthMatch || !clockMatch) return null;

  return {
    title: decodeHtmlEntities(titleMatch[1]).trim(),
    weekdayName: dayMonthMatch[1],
    day: Number(dayMonthMatch[2]),
    month: Number(dayMonthMatch[3]),
    hour: Number(clockMatch[1]),
    minute: Number(clockMatch[2]),
    venueName: decodeHtmlEntities(placeMatch[1]).trim(),
    url,
  };
}

function describedAsStandup(title: string): boolean {
  const lower = title.toLowerCase();
  return STANDUP_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()));
}

export const tomixConnector: Connector = {
  slug: "tomix",
  tier: 3,

  async *fetch(opts) {
    const origin = new URL(ORIGIN).origin;
    if (!(await isAllowedByRobots(origin, "/product/"))) {
      throw new Error(`robots.txt disallows /product/ on ${origin}`);
    }

    const rateLimiter = new RateLimiter(DEFAULT_INTERVAL_MS);
    const now = new Date();

    const indexResponse = await fetchWithRetry(SITEMAP_INDEX_URL, { signal: opts.signal, rateLimiter });
    if (!indexResponse.ok) throw new Error(`Failed to fetch sitemap index: HTTP ${indexResponse.status}`);
    const sitemapUrls = discoverProductSitemapUrls(await indexResponse.text());

    const productUrls: string[] = [];
    for (const sitemapUrl of sitemapUrls) {
      const response = await fetchWithRetry(sitemapUrl, { signal: opts.signal, rateLimiter, maxRetries: 1 });
      if (!response.ok) continue;
      productUrls.push(...discoverRecentProductUrls(await response.text(), now));
    }

    const session = await openBrowserSession({ minIntervalMs: DEFAULT_INTERVAL_MS });
    try {
      let emitted = 0;
      for (const productUrl of productUrls) {
        if (opts.limit && emitted >= opts.limit) return;

        const html = await fetchRenderedHtml(session, productUrl, { waitForSelector: "h1.mix-main-title" });
        if (!html) continue;

        const details = extractShowDetails(html, productUrl);
        if (!details) continue; // merchandise, not a show

        emitted++;
        yield { externalId: productUrl, payload: details };
      }
    } finally {
      await session.close();
    }
  },

  normalize(item: RawItem): NormalizedListing | null {
    const details = item.payload as TomixShowDetails;
    const expectedDow = FULL_WEEKDAY_TO_JS_DAY[details.weekdayName];
    if (expectedDow === undefined) return null;

    const startsAt = resolveDate(details.day, details.month, details.hour, details.minute, expectedDow, new Date());
    if (!startsAt) return null;

    const listing: NormalizedListing = {
      sourceSlug: "tomix",
      externalId: item.externalId,
      title: details.title,
      artistNames: [details.title],
      venueName: details.venueName,
      cityName: guessCityFromVenueName(details.venueName),
      startsAt: startsAt.toISOString(),
      categoryHint: describedAsStandup(details.title) ? "standup" : "music",
      currency: "ILS",
      availability: "available",
      status: "scheduled",
      url: details.url,
    };

    const validation = validateListing(listing, SOURCE_DOMAIN);
    if (!validation.valid) return null;

    return listing;
  },
};
