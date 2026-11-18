import { zonedTimeToUtc } from "@tiktim/shared";
import type { Connector, NormalizedListing, RawItem } from "./types";
import { isAllowedByRobots } from "./_seller-base/robots";
import { validateListing } from "./_seller-base/validate-listing";
import { openBrowserSession, captureJsonResponse } from "./_seller-base/browser-fetch";

const ORIGIN = "https://barby.co.il";
const SOURCE_DOMAIN = "barby.co.il";
const VENUE_NAME = "בארבי";
const CITY_NAME = "תל אביב";
const DEFAULT_INTERVAL_MS = 2500;
// The API returns a bare filename; the card markup on the site resolves it
// against this CDN host.
const IMAGE_BASE = "https://images.barby.co.il/Logos";

// Barby is a Tel Aviv rock club — almost every show is music. A handful of
// stand-up nights do run there occasionally, so still check the title.
const STANDUP_KEYWORDS = ["סטנדאפ", "סטנד-אפ", "קומדי", "stand up", "standup"];

export type BarbyShow = {
  showId: string;
  showDate: string; // DD/MM/YYYY
  showTime: string; // HH:MM
  showName: string;
  showPrice?: string;
  showSold?: number;
  showSoldMaxBuy?: string;
  showImage?: string;
};

function describedAsStandup(title: string): boolean {
  const lower = title.toLowerCase();
  return STANDUP_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()));
}

export function parseBarbyDate(showDate: string | undefined, showTime: string | undefined): Date | null {
  if (!showDate || !showTime) return null;
  const dateMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(showDate.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(showTime.trim());
  if (!dateMatch || !timeMatch) return null;

  const [, day, month, year] = dateMatch;
  const [, hour, minute] = timeMatch;
  const date = zonedTimeToUtc(Number(year), Number(month), Number(day), Number(hour), Number(minute), 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inferAvailability(show: BarbyShow): NormalizedListing["availability"] {
  const sold = show.showSold;
  const maxBuy = show.showSoldMaxBuy ? Number(show.showSoldMaxBuy) : undefined;
  if (sold === undefined || maxBuy === undefined || Number.isNaN(maxBuy)) return "unknown";
  if (sold >= maxBuy) return "sold_out";
  if (sold / maxBuy >= 0.9) return "few_left";
  return "available";
}

export const barbyConnector: Connector = {
  slug: "barby",
  tier: 3,

  async *fetch(opts) {
    const origin = new URL(ORIGIN).origin;
    if (!(await isAllowedByRobots(origin, "/"))) {
      throw new Error(`robots.txt disallows ${origin}`);
    }

    const session = await openBrowserSession({ minIntervalMs: DEFAULT_INTERVAL_MS });
    try {
      const body = (await captureJsonResponse(session, ORIGIN, "/api/shows/find")) as {
        returnShow?: { show?: BarbyShow[] };
      } | null;
      const shows = body?.returnShow?.show ?? [];

      let emitted = 0;
      for (const show of shows) {
        if (opts.limit && emitted >= opts.limit) return;
        if (!show.showId) continue;
        emitted++;
        yield { externalId: show.showId, payload: show };
      }
    } finally {
      await session.close();
    }
  },

  normalize(item: RawItem): NormalizedListing | null {
    const show = item.payload as BarbyShow;
    const startsAt = parseBarbyDate(show.showDate, show.showTime);
    if (!startsAt) return null;

    const title = show.showName?.trim();
    if (!title) return null;

    const listing: NormalizedListing = {
      sourceSlug: "barby",
      externalId: item.externalId,
      title,
      artistNames: [title],
      venueName: VENUE_NAME,
      cityName: CITY_NAME,
      startsAt: startsAt.toISOString(),
      categoryHint: describedAsStandup(title) ? "standup" : "music",
      priceMin: show.showPrice ? Number(show.showPrice) : undefined,
      priceMax: show.showPrice ? Number(show.showPrice) : undefined,
      currency: "ILS",
      imageUrl: show.showImage ? `${IMAGE_BASE}/${encodeURIComponent(show.showImage)}` : undefined,
      availability: inferAvailability(show),
      status: "scheduled",
      url: `${ORIGIN}/show/${show.showId}`,
    };

    const validation = validateListing(listing, SOURCE_DOMAIN);
    if (!validation.valid) return null;

    return listing;
  },
};
