import { RateLimiter, fetchWithRetry } from "../../lib/http";
import type { RawItem } from "../types";
import { isAllowedByRobots, getCrawlDelayMs } from "./robots";

export type SitemapEntry = { url: string; externalId: string; lastmod?: string };

export type SellerSiteConfig = {
  slug: string;
  originUrl: string;
  sitemapUrl: string;
  /** Minimum ms between requests to this domain if robots.txt declares no Crawl-Delay. */
  defaultIntervalMs?: number;
  /** Parses the sitemap XML into event-page entries worth fetching. */
  discoverEntries(sitemapXml: string): SitemapEntry[];
  /** Extracts a JSON-serializable payload from one event page's HTML, or null to skip it. */
  extractPayload(html: string, entry: SitemapEntry): unknown | null;
};

const MAX_CONSECUTIVE_FORBIDDEN = 3;

/**
 * Shared Tier 3 "seller-site reader" base: sitemap discovery, robots.txt +
 * rate-limit politeness, and a stop-on-repeated-403 circuit breaker — per
 * docs/INGESTION.md's Tier 3 connectors section. Each concrete connector
 * (e.g. leaan.ts) supplies its own discovery/extraction logic and still
 * writes its own `normalize()`, since category mapping is source-specific.
 */
export function createSellerSiteFetch(config: SellerSiteConfig) {
  return async function* fetch(opts: { since?: Date; limit?: number; signal: AbortSignal }): AsyncIterable<RawItem> {
    const origin = new URL(config.originUrl).origin;

    const sitemapPath = new URL(config.sitemapUrl).pathname;
    if (!(await isAllowedByRobots(origin, sitemapPath))) {
      throw new Error(`robots.txt disallows ${sitemapPath} on ${origin}`);
    }

    const crawlDelayMs = (await getCrawlDelayMs(origin)) ?? config.defaultIntervalMs ?? 2500;
    const rateLimiter = new RateLimiter(crawlDelayMs);

    const sitemapResponse = await fetchWithRetry(config.sitemapUrl, { signal: opts.signal, rateLimiter });
    if (!sitemapResponse.ok) throw new Error(`Failed to fetch sitemap: HTTP ${sitemapResponse.status}`);
    const sitemapXml = await sitemapResponse.text();

    let entries = config.discoverEntries(sitemapXml);
    if (opts.since) {
      entries = entries.filter((e) => !e.lastmod || new Date(e.lastmod) >= opts.since!);
    }

    let emitted = 0;
    let consecutiveForbidden = 0;

    for (const entry of entries) {
      if (opts.limit && emitted >= opts.limit) return;

      const pagePath = new URL(entry.url).pathname;
      if (!(await isAllowedByRobots(origin, pagePath))) continue;

      const response = await fetchWithRetry(entry.url, { signal: opts.signal, rateLimiter, maxRetries: 1 });

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
      const payload = config.extractPayload(html, entry);
      if (payload === null) continue;

      emitted++;
      yield { externalId: entry.externalId, payload };
    }
  };
}
