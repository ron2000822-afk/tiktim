import { zonedTimeToUtc } from "@tiktim/shared";
import { RateLimiter, fetchWithRetry } from "../lib/http";
import type { Connector, NormalizedListing, RawItem } from "./types";
import { isAllowedByRobots, getCrawlDelayMs } from "./_seller-base/robots";
import { validateListing } from "./_seller-base/validate-listing";
import { guessCityFromVenueName } from "./_seller-base/guess-city";

const ORIGIN = "https://www.kupat.co.il";
const SOURCE_DOMAIN = "kupat.co.il";
const DEFAULT_INTERVAL_MS = 2000;
const PAGE_SIZE = 100;

// kupat.co.il's own backend is a general entertainment CMS shared with a
// cinema booking system (confirmed live: show records carry Director/
// Actors/Dub_Language fields) — it lists far more than music/stand-up
// (festivals, movies, theater, family events). There's no reliably
// resolvable category name via its public API, so scope is enforced with
// keyword checks on the title, same pattern as leaan's kids-category filter.
const STANDUP_KEYWORDS = ["סטנדאפ", "סטנד-אפ", "קומדי נייט", "stand up", "standup"];
const OUT_OF_SCOPE_KEYWORDS = [
  "פסטיגל",
  "פסטיבל",
  "תיאטרון",
  "הצגה",
  "קולנוע",
  "סרט",
  "קרקס",
  "תערוכה",
  "ילדים",
  "משפחה",
  "סיור",
  "מחזמר",
];

function buildVenuesUrl(page: number): string {
  const params = new URLSearchParams();
  params.set("fields[0]", "Name");
  params.set("fields[1]", "Slug");
  params.set("populate[Events][fields][0]", "Feature_Name");
  params.set("populate[Events][fields][1]", "Date_Time");
  params.set("populate[Events][fields][2]", "Event_ID");
  params.set("populate[Events][fields][3]", "Soldout");
  params.set("populate[Events][fields][4]", "Min_Price");
  params.set("populate[Events][fields][5]", "Max_Price");
  params.set("populate[Events][populate][Show][fields][0]", "Name");
  params.set("populate[Events][populate][Show][fields][1]", "Show_ID");
  params.set("populate[Events][populate][Show][fields][2]", "Slug");
  params.set("pagination[pageSize]", String(PAGE_SIZE));
  params.set("pagination[page]", String(page));
  return `${ORIGIN}/api/venues?${params.toString()}`;
}

export type KupatEvent = {
  Event_ID: number;
  Date_Time: string; // "YYYY-MM-DD HH:MM:SS", Asia/Jerusalem local
  Feature_Name?: string;
  Soldout?: boolean;
  Min_Price?: number;
  Max_Price?: number;
  Show?: { data?: { attributes?: { Name?: string; Show_ID?: number; Slug?: string } } };
};

export type KupatRawEvent = {
  event: KupatEvent;
  venueName: string;
};

type VenuesApiResponse = {
  data: Array<{
    attributes: {
      Name: string;
      Slug: string;
      Events?: { data?: Array<{ attributes: KupatEvent }> };
    };
  }>;
  meta: { pagination: { pageCount: number } };
};

function matchesAnyKeyword(title: string, keywords: string[]): boolean {
  const lower = title.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

export function parseKupatDateTime(dateTime: string | undefined): Date | null {
  if (!dateTime) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(dateTime.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const date = zonedTimeToUtc(Number(year), Number(month), Number(day), Number(hour), Number(minute), 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const kupatConnector: Connector = {
  slug: "kupat",
  tier: 3,

  async *fetch(opts) {
    const origin = new URL(ORIGIN).origin;
    if (!(await isAllowedByRobots(origin, "/api/venues"))) {
      throw new Error(`robots.txt disallows /api/venues on ${origin}`);
    }

    const crawlDelayMs = (await getCrawlDelayMs(origin)) ?? DEFAULT_INTERVAL_MS;
    const rateLimiter = new RateLimiter(crawlDelayMs);

    let emitted = 0;
    let page = 1;
    let pageCount = 1;

    do {
      const response = await fetchWithRetry(buildVenuesUrl(page), { signal: opts.signal, rateLimiter });
      if (!response.ok) throw new Error(`Failed to fetch venues page ${page}: HTTP ${response.status}`);
      const body = (await response.json()) as VenuesApiResponse;

      pageCount = body.meta?.pagination?.pageCount ?? 1;

      for (const venue of body.data) {
        const venueName = venue.attributes.Name;
        const events = venue.attributes.Events?.data ?? [];
        for (const eventRow of events) {
          if (opts.limit && emitted >= opts.limit) return;
          const event = eventRow.attributes;
          if (!event.Event_ID) continue;
          emitted++;
          const raw: KupatRawEvent = { event, venueName };
          yield { externalId: String(event.Event_ID), payload: raw };
        }
      }

      page++;
    } while (page <= pageCount && !(opts.limit && emitted >= opts.limit));
  },

  normalize(item: RawItem): NormalizedListing | null {
    const { event, venueName } = item.payload as KupatRawEvent;

    const title = (event.Feature_Name || event.Show?.data?.attributes?.Name)?.trim();
    if (!title) return null;
    if (matchesAnyKeyword(title, OUT_OF_SCOPE_KEYWORDS)) return null;

    const startsAt = parseKupatDateTime(event.Date_Time);
    if (!startsAt) return null;

    const slug = event.Show?.data?.attributes?.Slug;
    if (!slug) return null;

    const listing: NormalizedListing = {
      sourceSlug: "kupat",
      externalId: item.externalId,
      title,
      artistNames: [title],
      venueName,
      cityName: guessCityFromVenueName(venueName),
      startsAt: startsAt.toISOString(),
      categoryHint: matchesAnyKeyword(title, STANDUP_KEYWORDS) ? "standup" : "music",
      priceMin: event.Min_Price,
      priceMax: event.Max_Price,
      currency: "ILS",
      availability: event.Soldout ? "sold_out" : "available",
      status: "scheduled",
      url: `${ORIGIN}/show/${slug}`,
    };

    const validation = validateListing(listing, SOURCE_DOMAIN);
    if (!validation.valid) return null;

    return listing;
  },
};
