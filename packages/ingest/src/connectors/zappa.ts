import { RateLimiter, fetchWithRetry } from "../lib/http";
import type { Connector, NormalizedListing, RawItem } from "./types";
import { isAllowedByRobots, getCrawlDelayMs } from "./_seller-base/robots";
import { validateListing } from "./_seller-base/validate-listing";
import { extractEventJsonLd, extractPriceRange, mapJsonLdEventToListingFields } from "./_seller-base/extract-jsonld";
import { fetchGzippedXml } from "./_seller-base/fetch-gzip-xml";

const ORIGIN = "https://www.zappa-club.co.il";
const SOURCE_DOMAIN = "zappa-club.co.il";
const DEFAULT_INTERVAL_MS = 2500;
const MAX_CONSECUTIVE_FORBIDDEN = 3;

// Confirmed live via robots.txt: the real sitemap lives under /staticsite/,
// not the usual /sitemap.xml (which just redirects to the homepage), split
// by content type. Events (single-performance pages) and EventSeries
// (artist "all upcoming shows" pages, each embedding its performances as
// JSON-LD subEvent nodes) both carry bookable listings; venue/city/artist
// bio/image sitemaps don't.
const SITEMAP_URLS = [
  `${ORIGIN}/staticsite/sitemap/ZPE/events1_he.xml.gz`,
  `${ORIGIN}/staticsite/sitemap/ZPE/eventseries1_he.xml.gz`,
];

// Confirmed live: this Eventim-platform site tags virtually everything
// "MusicEvent" regardless of true genre (a real stand-up comedian's show
// was typed MusicEvent) — the schema.org @type can't be trusted for
// category. The free-text description (both the page's own and the
// nested product description) is the only place "סטנדאפ" reliably shows up.
const STANDUP_KEYWORDS = ["סטנדאפ", "סטנד אפ", "סטנד-אפ", "standup", "stand up", "stand-up"];

type ZappaEventData = ReturnType<typeof extractEventJsonLd>[number];

function discoverUrlsFromSitemap(sitemapXml: string): string[] {
  const urls: string[] = [];
  for (const match of sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    urls.push(match[1].trim());
  }
  return urls;
}

function describedAsStandup(event: ZappaEventData): boolean {
  const offers = Array.isArray(event.offers) ? event.offers : event.offers ? [event.offers] : [];
  const descriptions: string[] = [typeof event.description === "string" ? event.description : ""];
  for (const offer of offers as Record<string, unknown>[]) {
    const itemOffered = offer.itemOffered as Record<string, unknown> | undefined;
    if (typeof itemOffered?.description === "string") descriptions.push(itemOffered.description);
  }
  const haystack = descriptions.join(" ").toLowerCase();
  return STANDUP_KEYWORDS.some((kw) => haystack.includes(kw.toLowerCase()));
}

export const zappaConnector: Connector = {
  slug: "zappa",
  tier: 3,

  async *fetch(opts) {
    const origin = new URL(ORIGIN).origin;
    const rateLimiter = new RateLimiter((await getCrawlDelayMs(origin)) ?? DEFAULT_INTERVAL_MS);

    const pageUrls: string[] = [];
    for (const sitemapUrl of SITEMAP_URLS) {
      const sitemapPath = new URL(sitemapUrl).pathname;
      if (!(await isAllowedByRobots(origin, sitemapPath))) continue;

      const xml = await fetchGzippedXml(sitemapUrl, { rateLimiter, signal: opts.signal });
      if (!xml) continue;
      pageUrls.push(...discoverUrlsFromSitemap(xml));
    }

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
      // One page can yield several listings: an EventSeries artist page
      // embeds every upcoming performance as its own subEvent node, each
      // with its own offer.url pointing at its specific /event/ page —
      // confirmed live, that per-subEvent URL differs from the artist
      // page's own URL and must be preferred when present.
      for (const event of extractEventJsonLd(html)) {
        if (opts.limit && emitted >= opts.limit) return;

        const offers = Array.isArray(event.offers) ? event.offers : event.offers ? [event.offers] : [];
        const offerUrl = (offers[0] as Record<string, unknown> | undefined)?.url;
        const eventUrl = typeof offerUrl === "string" ? offerUrl : pageUrl;
        const idMatch = /-(\d+)\/?$/.exec(new URL(eventUrl).pathname);
        const externalId = idMatch?.[1] ?? eventUrl;

        emitted++;
        yield { externalId, payload: { ...event, _sourceUrl: eventUrl } };
      }
    }
  },

  normalize(item: RawItem): NormalizedListing | null {
    const event = item.payload as ZappaEventData & { _sourceUrl: string };
    const fields = mapJsonLdEventToListingFields(event);
    if (!fields.title || !fields.startsAt || !fields.venueName) return null;

    const priceRange = extractPriceRange(event);

    const listing: NormalizedListing = {
      sourceSlug: "zappa",
      externalId: item.externalId,
      title: fields.title,
      artistNames: fields.artistNames.length > 0 ? fields.artistNames : [fields.title],
      venueName: fields.venueName,
      cityName: fields.cityName,
      address: fields.address,
      lat: fields.lat,
      lng: fields.lng,
      startsAt: fields.startsAt,
      categoryHint: describedAsStandup(event) ? "standup" : "music",
      priceMin: priceRange?.min,
      priceMax: priceRange?.max,
      currency: priceRange?.currency ?? "ILS",
      availability: "available",
      status: fields.status ?? "scheduled",
      url: event._sourceUrl,
      imageUrl: fields.imageUrl,
    };

    const validation = validateListing(listing, SOURCE_DOMAIN);
    if (!validation.valid) return null;

    return listing;
  },
};
