import type { NormalizedListing } from "../types";

export type ValidationResult = { valid: true } | { valid: false; reason: string };

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const MAX_PRICE_ILS = 3000;

/**
 * The validation layer INGESTION.md calls out as "what Tickchak lacks":
 * every Tier 3 listing must pass these checks before it can reach the
 * normal matching pipeline. Failures should route to review_queue, never
 * straight to the site.
 */
export function validateListing(listing: NormalizedListing, sourceDomain: string): ValidationResult {
  if (!listing.title.trim()) return { valid: false, reason: "empty title" };

  const startsAt = new Date(listing.startsAt);
  if (Number.isNaN(startsAt.getTime())) return { valid: false, reason: "unparseable startsAt" };
  if (startsAt.getTime() < Date.now() - SIX_HOURS_MS) {
    return { valid: false, reason: "start time more than 6h in the past" };
  }

  if (!listing.venueName.trim()) return { valid: false, reason: "missing venue name" };
  if (!listing.cityName?.trim()) return { valid: false, reason: "missing city name" };

  if (listing.priceMin !== undefined && (listing.priceMin < 0 || listing.priceMin > MAX_PRICE_ILS)) {
    return { valid: false, reason: `priceMin out of range: ${listing.priceMin}` };
  }
  if (listing.priceMax !== undefined && (listing.priceMax < 0 || listing.priceMax > MAX_PRICE_ILS)) {
    return { valid: false, reason: `priceMax out of range: ${listing.priceMax}` };
  }

  let url: URL;
  try {
    url = new URL(listing.url);
  } catch {
    return { valid: false, reason: "unparseable url" };
  }
  if (!url.hostname.endsWith(sourceDomain)) {
    return { valid: false, reason: `url not on source domain: ${url.hostname}` };
  }

  return { valid: true };
}
