import type { Connector, NormalizedListing, RawItem } from "./types";
import { createSellerSiteFetch, type SitemapEntry } from "./_seller-base/seller-site-connector";
import { validateListing } from "./_seller-base/validate-listing";

const ORIGIN = "https://www.leaan.co.il";
const SOURCE_DOMAIN = "leaan.co.il";
const MUSIC_CATEGORY_ID = "3";
const ENTERTAINMENT_CATEGORY_ID = "4"; // Leaan lumps live music + standup under one bucket
const STANDUP_KEYWORDS = ["סטנדאפ", "סטנד אפ", "סטנד-אפ", "standup", "stand up", "stand-up"];

type LeaanEventData = {
  id: number;
  event_name?: string;
  name?: string;
  location?: { name?: string; city?: string; street?: string };
  event_start?: number;
  event_end?: number;
  starting_price?: number;
  categories?: Record<string, { category_id: string; category_name: string }>;
  active?: boolean;
  sold_out?: boolean;
  _sourceUrl: string;
};

function discoverEntries(sitemapXml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  const urlBlockRegex = /<url>([\s\S]*?)<\/url>/g;

  for (const block of sitemapXml.matchAll(urlBlockRegex)) {
    const locMatch = /<loc>([^<]+)<\/loc>/.exec(block[1]);
    const lastmodMatch = /<lastmod>([^<]+)<\/lastmod>/.exec(block[1]);
    if (!locMatch) continue;

    const url = locMatch[1].trim();
    const pathMatch = /\/events\/[^/]+\/(\d+)$/.exec(new URL(url).pathname);
    if (!pathMatch) continue;

    entries.push({ url, externalId: pathMatch[1], lastmod: lastmodMatch?.[1] });
  }

  // The sitemap repeats some entries verbatim; dedupe by externalId.
  const seen = new Set<string>();
  return entries.filter((e) => (seen.has(e.externalId) ? false : (seen.add(e.externalId), true)));
}

function extractPayload(html: string, entry: SitemapEntry): unknown | null {
  const match = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1]);
    const data = parsed?.props?.pageProps?.data;
    if (!data || typeof data !== "object") return null;
    return { ...data, _sourceUrl: entry.url };
  } catch {
    return null;
  }
}

function mapCategoryHint(data: LeaanEventData): "music" | "standup" | "other" | null {
  const categories = Object.values(data.categories ?? {});
  const categoryIds = new Set(categories.map((c) => c.category_id));
  const title = data.event_name ?? data.name ?? "";

  if (categoryIds.has(MUSIC_CATEGORY_ID) && !STANDUP_KEYWORDS.some((kw) => title.toLowerCase().includes(kw.toLowerCase()))) {
    return "music";
  }
  if (categoryIds.has(ENTERTAINMENT_CATEGORY_ID)) {
    return STANDUP_KEYWORDS.some((kw) => title.toLowerCase().includes(kw.toLowerCase())) ? "standup" : "music";
  }
  return null; // sports, theater, kids, etc. — out of V1 scope
}

export const leaanConnector: Connector = {
  slug: "leaan",
  tier: 3,

  fetch: createSellerSiteFetch({
    slug: "leaan",
    originUrl: ORIGIN,
    sitemapUrl: `${ORIGIN}/sitemap.xml`,
    defaultIntervalMs: 2500,
    discoverEntries,
    extractPayload,
  }),

  normalize(item: RawItem): NormalizedListing | null {
    const data = item.payload as LeaanEventData;
    if (data.active === false) return null;

    const categoryHint = mapCategoryHint(data);
    if (!categoryHint || categoryHint === "other") return null;

    const title = data.event_name ?? data.name;
    if (!title || !data.event_start || !data.location?.name) return null;

    const listing: NormalizedListing = {
      sourceSlug: "leaan",
      externalId: String(data.id),
      title,
      artistNames: [title],
      venueName: data.location.name,
      cityName: data.location.city,
      address: data.location.street,
      startsAt: new Date(data.event_start * 1000).toISOString(),
      doorsAt: data.event_end ? new Date(data.event_end * 1000).toISOString() : undefined,
      categoryHint,
      priceMin: data.starting_price,
      currency: "ILS",
      availability: data.sold_out ? "sold_out" : "available",
      status: "scheduled",
      url: data._sourceUrl,
    };

    const validation = validateListing(listing, SOURCE_DOMAIN);
    if (!validation.valid) return null;

    return listing;
  },
};
