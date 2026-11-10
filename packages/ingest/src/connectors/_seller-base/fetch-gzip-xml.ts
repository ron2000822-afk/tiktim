import { gunzipSync } from "node:zlib";
import { fetchWithRetry, type RateLimiter } from "../../lib/http";

/** Fetches a `.xml.gz` sitemap (confirmed live on zappa-club.co.il's Eventim-platform sitemaps) and returns the decompressed XML text. */
export async function fetchGzippedXml(url: string, opts: { rateLimiter: RateLimiter; signal?: AbortSignal }): Promise<string | null> {
  const response = await fetchWithRetry(url, { signal: opts.signal, rateLimiter: opts.rateLimiter });
  if (!response.ok) return null;

  const compressed = Buffer.from(await response.arrayBuffer());
  try {
    return gunzipSync(compressed).toString("utf-8");
  } catch {
    return null;
  }
}
