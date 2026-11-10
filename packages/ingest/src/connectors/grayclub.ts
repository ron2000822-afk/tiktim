import { zonedTimeToUtc } from "@tiktim/shared";
import type { Connector, NormalizedListing, RawItem } from "./types";
import { createSellerSiteFetch, type SitemapEntry } from "./_seller-base/seller-site-connector";
import { validateListing } from "./_seller-base/validate-listing";
import { decodeHtmlEntities } from "./_seller-base/decode-html-entities";

const ORIGIN = "https://grayclub.co.il";
const SOURCE_DOMAIN = "grayclub.co.il";
const STANDUP_KEYWORDS = ["סטנדאפ", "סטנד אפ", "סטנד-אפ", "standup", "stand up", "stand-up"];

// Gray Club runs three physical branches; the page's own branch label has
// no space ("תלאביב") so it can't be used directly as a city name.
const BRANCH_TO_CITY: Record<string, string> = {
  תלאביב: "תל אביב",
  יהוד: "יהוד",
  מודיעין: "מודיעין",
};

type GrayClubEventData = {
  title: string;
  branch?: string;
  priceAmount?: number;
  dateText: string; // e.g. "שבת, 13.02.2027" or "יום חמישי, 10.12.2026"
  doorsTime?: string; // "20:00"
  startTime?: string; // "22:00"
  address?: string;
  _sourceUrl: string;
};

export function discoverEntries(sitemapXml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const block of sitemapXml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const locMatch = /<loc>([^<]+)<\/loc>/.exec(block[1]);
    const lastmodMatch = /<lastmod>([^<]+)<\/lastmod>/.exec(block[1]);
    if (!locMatch) continue;

    const url = locMatch[1].trim();
    const pathMatch = /^\/event\/\d+\/(\d+)\/?$/.exec(new URL(url).pathname);
    if (!pathMatch) continue;

    entries.push({ url, externalId: pathMatch[1], lastmod: lastmodMatch?.[1] });
  }
  return entries;
}

export function extractPayload(html: string, entry: SitemapEntry): unknown | null {
  const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html);
  const dateMatch = /event_icon_1\.svg" alt="">\s*<\/div>\s*<strong>([^<]*)<\/strong>/.exec(html);
  if (!h1Match || !dateMatch) return null;

  const branchMatch = /category_title_box">\s*<h2>\s*<a[^>]*>[\s\S]*?<\/a>\s*<span[^>]*>([^<]*)<\/span>/.exec(html);
  const priceMatch = /class="price">[\s\S]*?<bdi class="h2">\s*([\d,]+)<span class="woocommerce-Price-currencySymbol">/.exec(html);
  const doorsMatch = /event_icon_3\.svg" alt="">\s*<\/div>\s*<strong>פתיחת דלתות: ([^<]*)<\/strong>/.exec(html);
  const startMatch = /event_icon_4\.svg" alt="">\s*<\/div>\s*<strong>תחילת מופע: ([^<]*)<\/strong>/.exec(html);
  const addressMatch = /event_icon_5\.svg" alt="">\s*<\/div>\s*<strong>כתובת: ([^<]*)<\/strong>/.exec(html);

  const data: GrayClubEventData = {
    title: decodeHtmlEntities(h1Match[1]).trim(),
    branch: branchMatch?.[1]?.trim(),
    priceAmount: priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : undefined,
    dateText: dateMatch[1].trim(),
    doorsTime: doorsMatch?.[1]?.trim(),
    startTime: startMatch?.[1]?.trim(),
    address: addressMatch ? decodeHtmlEntities(addressMatch[1]).trim() : undefined,
    _sourceUrl: entry.url,
  };
  return data;
}

const DATE_RE = /(\d{2})\.(\d{2})\.(\d{4})/;

function toIso(dateText: string, timeText: string | undefined): string | undefined {
  const dateMatch = DATE_RE.exec(dateText);
  if (!dateMatch || !timeText) return undefined;

  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeText);
  if (!timeMatch) return undefined;

  const [, dd, mm, yyyy] = dateMatch;
  const [, hh, min] = timeMatch;
  return zonedTimeToUtc(Number(yyyy), Number(mm), Number(dd), Number(hh), Number(min), 0).toISOString();
}

function mapCategoryHint(title: string): "music" | "standup" {
  const lower = title.toLowerCase();
  return STANDUP_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase())) ? "standup" : "music";
}

export const grayclubConnector: Connector = {
  slug: "grayclub",
  tier: 3,

  fetch: createSellerSiteFetch({
    slug: "grayclub",
    originUrl: ORIGIN,
    sitemapUrl: `${ORIGIN}/shows-sitemap.xml`,
    defaultIntervalMs: 2500,
    discoverEntries,
    extractPayload,
  }),

  normalize(item: RawItem): NormalizedListing | null {
    const data = item.payload as GrayClubEventData;
    if (!data.title) return null;

    const startsAt = toIso(data.dateText, data.startTime);
    if (!startsAt) return null;
    const doorsAt = toIso(data.dateText, data.doorsTime);

    const cityName = data.branch ? BRANCH_TO_CITY[data.branch] : undefined;

    const listing: NormalizedListing = {
      sourceSlug: "grayclub",
      externalId: item.externalId,
      title: data.title,
      artistNames: [data.title],
      venueName: "מועדון הגריי",
      cityName,
      address: data.address,
      startsAt,
      doorsAt,
      categoryHint: mapCategoryHint(data.title),
      priceMin: data.priceAmount,
      priceMax: data.priceAmount,
      currency: "ILS",
      availability: "available",
      status: "scheduled",
      url: data._sourceUrl,
    };

    const validation = validateListing(listing, SOURCE_DOMAIN);
    if (!validation.valid) return null;

    return listing;
  },
};
