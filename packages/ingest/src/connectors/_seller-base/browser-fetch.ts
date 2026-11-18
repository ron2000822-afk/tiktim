import { chromium, type Browser, type BrowserContext } from "playwright";
import { RateLimiter } from "../../lib/http";

export type BrowserSession = {
  context: BrowserContext;
  rateLimiter: RateLimiter;
  close(): Promise<void>;
};

/**
 * Opens one browser for a whole connector run (not one per page — launching
 * Chromium per request would be far slower and heavier than necessary).
 * Used for sites where a plain HTTP fetch isn't enough: either the content
 * is rendered client-side after page load (confirmed live: barby.co.il,
 * kupat.co.il, to-mix.co.il), or the site's bot-detection actively rejects
 * non-browser clients regardless of IP (confirmed live: zappa-club.co.il
 * returns an HTTP/2 stream reset to a plain curl/fetch request even from a
 * real Israeli IP, but completes normally for an actual browser).
 */
export async function openBrowserSession(opts: {
  minIntervalMs: number;
  userAgent?: string;
  /**
   * Drive a real, visible Chrome instead of bundled headless Chromium.
   *
   * Some WAFs fingerprint headless mode specifically. Confirmed live on
   * zappa-club.co.il and eventim.co.il: bundled Chromium headless AND real
   * Chrome headless both die with ERR_HTTP2_PROTOCOL_ERROR, while real
   * Chrome headful returns 200 — same machine, same IP, same moment. The
   * difference is the headless fingerprint, not the network or the address.
   *
   * The cost is that this needs a display: fine locally, but CI must run it
   * under a virtual framebuffer (xvfb-run) or the launch fails outright.
   */
  headful?: boolean;
}): Promise<BrowserSession> {
  const browser: Browser = opts.headful
    ? await chromium.launch({ headless: false, channel: "chrome" })
    : await chromium.launch({ headless: true });
  const context = await browser.newContext(opts.userAgent ? { userAgent: opts.userAgent } : {});
  const rateLimiter = new RateLimiter(opts.minIntervalMs);

  return {
    context,
    rateLimiter,
    async close() {
      await context.close();
      await browser.close();
    },
  };
}

/**
 * Some sites' real data never appears in rendered HTML at all — the page is a
 * thin SPA shell that calls its own JSON API client-side (confirmed live:
 * barby.co.il's homepage fires `/api/shows/find`, which returns the full
 * upcoming-shows list already structured — far more reliable than scraping
 * rendered card markup). The API itself answers 403 to a plain fetch (same
 * Cloudflare bot-check as the HTML), so it must be captured from inside a
 * real page load, which carries a valid Cloudflare clearance cookie.
 * Returns the first response whose URL matches `urlIncludes`, parsed as
 * JSON — or null if no matching response arrives before `timeoutMs`.
 */
export async function captureJsonResponse(
  session: BrowserSession,
  pageUrl: string,
  urlIncludes: string,
  opts: { timeoutMs?: number } = {},
): Promise<unknown | null> {
  const timeoutMs = opts.timeoutMs ?? 30000;
  await session.rateLimiter.wait();

  const page = await session.context.newPage();
  try {
    const responsePromise = page
      .waitForResponse((res) => res.url().includes(urlIncludes), { timeout: timeoutMs })
      .catch(() => null);
    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs }).catch(() => null);
    const response = await responsePromise;
    if (!response) return null;
    return await response.json().catch(() => null);
  } finally {
    await page.close();
  }
}

/** Navigates to `url` in a fresh tab, waits for client-side rendering to settle, and returns the fully rendered HTML — or null on any failure (never throws). */
export async function fetchRenderedHtml(
  session: BrowserSession,
  url: string,
  opts: { waitForSelector?: string; timeoutMs?: number } = {},
): Promise<string | null> {
  const timeoutMs = opts.timeoutMs ?? 30000;
  await session.rateLimiter.wait();

  const page = await session.context.newPage();
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    if (!response || !response.ok()) return null;

    if (opts.waitForSelector) {
      await page.waitForSelector(opts.waitForSelector, { timeout: timeoutMs }).catch(() => {});
    } else {
      await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => {});
    }

    return await page.content();
  } catch {
    return null;
  } finally {
    await page.close();
  }
}
