export interface RawItem {
  externalId: string; // stable id in the source
  payload: unknown; // raw JSON as received
}

export interface NormalizedListing {
  sourceSlug: string;
  externalId: string;
  title: string; // as shown by source
  artistNames: string[]; // best-effort extraction, headliner first
  tourName?: string;
  venueName: string;
  cityName?: string;
  address?: string;
  lat?: number;
  lng?: number;
  startsAt: string; // ISO with offset, Asia/Jerusalem if source is local
  doorsAt?: string;
  categoryHint?: "music" | "standup" | "other";
  genreHints?: string[];
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  availability?: "available" | "few_left" | "sold_out" | "unknown";
  status?: "scheduled" | "postponed" | "cancelled";
  url: string;
  imageUrl?: string; // only if license allows
  imageCredit?: string;
}

export interface Connector {
  slug: string;
  tier: 1 | 2 | 3 | 4;
  fetch(opts: { since?: Date; limit?: number; signal: AbortSignal }): AsyncIterable<RawItem>;
  normalize(item: RawItem): NormalizedListing | null; // null = skip (e.g. not music/standup)
  buildAffiliateUrl?(url: string, config: Record<string, unknown>): string;
}
