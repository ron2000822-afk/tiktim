import { fetchWithRetry, RateLimiter, USER_AGENT } from "../lib/http";
import { isAllowedByRobots, getCrawlDelayMs } from "./_seller-base/robots";
import { extractEventJsonLd, extractPriceRange } from "./_seller-base/extract-jsonld";
import type { Connector, NormalizedListing, RawItem } from "./types";

const API_BASE = "https://app.ticketmaster.com/discovery/v2/events.json";
const PAGE_SIZE = 200;
const MAX_CALLS_PER_RUN = 280; // stays well under the 300-call budget from docs/INGESTION.md
const MONTHS_AHEAD = 4;

// Keeps calls comfortably under the 5,000/day account quota even if run
// more than once in a day.
const rateLimiter = new RateLimiter(250);

// Ticketmaster's Discovery API (events.json) omits priceRanges for most
// Israeli listings — confirmed live, not a parsing bug. The event's own
// public page embeds a real price in schema.org JSON-LD instead, so
// enrichPrice() reads that page directly when the API gave us nothing.
// A fixed 1.5s/request pace is already well beyond any Crawl-delay
// ticketmaster.co.il's robots.txt declares (checked: none set).
const PRICE_PAGE_MIN_INTERVAL_MS = 1500;
const priceRateLimiter = new RateLimiter(PRICE_PAGE_MIN_INTERVAL_MS);

type TmImage = { url: string; width: number; height: number; ratio?: string };
type TmVenue = { name?: string; city?: { name?: string }; address?: { line1?: string }; location?: { latitude?: string; longitude?: string } };
type TmAttraction = { name?: string };
type TmEvent = {
  id: string;
  name: string;
  url?: string;
  images?: TmImage[];
  dates?: { start?: { dateTime?: string; localDate?: string }; status?: { code?: string } };
  priceRanges?: { min?: number; max?: number; currency?: string }[];
  classifications?: { segment?: { name?: string }; genre?: { name?: string } }[];
  _embedded?: { venues?: TmVenue[]; attractions?: TmAttraction[] };
};
type TmResponse = {
  _embedded?: { events?: TmEvent[] };
  page?: { totalPages?: number; number?: number };
};

function monthWindows(count: number): { start: Date; end: Date }[] {
  const windows: { start: Date; end: Date }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i + 1, 1));
    windows.push({ start, end });
  }
  return windows;
}

function toTmDateTime(date: Date): string {
  return date.toISOString().split(".")[0] + "Z";
}

async function* fetchPages(opts: { limit?: number; signal: AbortSignal }): AsyncIterable<RawItem> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    throw new Error("TICKETMASTER_API_KEY is not set");
  }

  let calls = 0;
  let emitted = 0;

  for (const window of monthWindows(MONTHS_AHEAD)) {
    let page = 0;
    let totalPages = 1;

    while (page < totalPages) {
      if (calls >= MAX_CALLS_PER_RUN) return;
      if (opts.limit && emitted >= opts.limit) return;

      const url = new URL(API_BASE);
      url.searchParams.set("apikey", apiKey);
      url.searchParams.set("countryCode", "IL");
      url.searchParams.set("classificationName", "music,comedy");
      url.searchParams.set("sort", "date,asc");
      url.searchParams.set("size", String(PAGE_SIZE));
      url.searchParams.set("page", String(page));
      url.searchParams.set("startDateTime", toTmDateTime(window.start));
      url.searchParams.set("endDateTime", toTmDateTime(window.end));

      const response = await fetchWithRetry(url.toString(), { signal: opts.signal, rateLimiter, headers: { "User-Agent": USER_AGENT } });
      calls++;

      if (!response.ok) {
        if (response.status === 404) break; // TM returns 404 when a window has zero results
        throw new Error(`Ticketmaster API error ${response.status}`);
      }

      const data = (await response.json()) as TmResponse;
      totalPages = data.page?.totalPages ?? 1;
      const items = data._embedded?.events ?? [];

      for (const event of items) {
        yield { externalId: event.id, payload: event };
        emitted++;
        if (opts.limit && emitted >= opts.limit) return;
      }

      if (items.length === 0) break;
      page++;
    }
  }
}

function mapCategoryHint(event: TmEvent): "music" | "standup" | "other" {
  const segment = event.classifications?.[0]?.segment?.name?.toLowerCase() ?? "";
  const genre = event.classifications?.[0]?.genre?.name?.toLowerCase() ?? "";
  if (segment === "music") return "music";
  if (segment === "arts & theatre" && genre.includes("comedy")) return "standup";
  if (genre.includes("comedy")) return "standup";
  return "other";
}

function mapStatus(code: string | undefined): NormalizedListing["status"] {
  switch (code) {
    case "cancelled":
      return "cancelled";
    case "postponed":
    case "rescheduled":
      return "postponed";
    default:
      return "scheduled";
  }
}

function mapAvailability(code: string | undefined): NormalizedListing["availability"] {
  switch (code) {
    case "onsale":
      return "available";
    case "offsale":
      return "sold_out";
    default:
      return "unknown";
  }
}

function pickImage(images: TmImage[] | undefined): string | undefined {
  if (!images) return undefined;
  const wide = images.filter((img) => img.width >= 1024 && (img.ratio === "16_9" || img.width / img.height > 1.5));
  return (wide[0] ?? images[0])?.url;
}

export const ticketmasterConnector: Connector = {
  slug: "ticketmaster",
  tier: 1,

  fetch(opts) {
    return fetchPages(opts);
  },

  normalize(item: RawItem): NormalizedListing | null {
    const event = item.payload as TmEvent;
    const categoryHint = mapCategoryHint(event);
    if (categoryHint === "other") return null;

    const venue = event._embedded?.venues?.[0];
    const attractions = event._embedded?.attractions ?? [];
    const startsAt = event.dates?.start?.dateTime;
    if (!venue?.name || !startsAt) return null;

    const priceRange = event.priceRanges?.[0];

    return {
      sourceSlug: "ticketmaster",
      externalId: event.id,
      title: event.name,
      artistNames: attractions.map((a) => a.name).filter((n): n is string => Boolean(n)),
      venueName: venue.name,
      cityName: venue.city?.name,
      address: venue.address?.line1,
      lat: venue.location?.latitude ? Number(venue.location.latitude) : undefined,
      lng: venue.location?.longitude ? Number(venue.location.longitude) : undefined,
      startsAt,
      categoryHint,
      priceMin: priceRange?.min,
      priceMax: priceRange?.max,
      currency: priceRange?.currency,
      availability: mapAvailability(event.dates?.status?.code),
      status: mapStatus(event.dates?.status?.code),
      url: event.url ?? "",
      imageUrl: pickImage(event.images),
      imageCredit: event.images?.length ? "Ticketmaster" : undefined,
    };
  },

  buildAffiliateUrl(url, config) {
    const publisherId = process.env.IMPACT_TICKETMASTER_PUBLISHER_ID;
    const campaignId = config.impactCampaignId as string | undefined;
    if (!publisherId || !campaignId) return url;
    const impactUrl = new URL("https://ticketmaster.evyy.net/c/click");
    impactUrl.searchParams.set("pid", publisherId);
    impactUrl.searchParams.set("camp", campaignId);
    impactUrl.searchParams.set("url", url);
    return impactUrl.toString();
  },

  async enrichPrice(listing) {
    try {
      const parsed = new URL(listing.url);
      const allowed = await isAllowedByRobots(parsed.origin, parsed.pathname);
      if (!allowed) return null;

      const declaredCrawlDelayMs = await getCrawlDelayMs(parsed.origin);
      if (declaredCrawlDelayMs && declaredCrawlDelayMs > PRICE_PAGE_MIN_INTERVAL_MS) {
        await new Promise((resolve) => setTimeout(resolve, declaredCrawlDelayMs - PRICE_PAGE_MIN_INTERVAL_MS));
      }

      const response = await fetchWithRetry(listing.url, { rateLimiter: priceRateLimiter, maxRetries: 1 });
      if (!response.ok) return null;

      const html = await response.text();
      const [eventNode] = extractEventJsonLd(html);
      if (!eventNode) return null;

      const priceRange = extractPriceRange(eventNode);
      if (!priceRange) return null;

      return { priceMin: priceRange.min, priceMax: priceRange.max, currency: priceRange.currency };
    } catch {
      return null;
    }
  },
};
