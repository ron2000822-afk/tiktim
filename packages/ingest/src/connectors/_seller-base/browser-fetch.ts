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
export async function openBrowserSession(opts: { minIntervalMs: number; userAgent?: string }): Promise<BrowserSession> {
  const browser: Browser = await chromium.launch({ headless: true });
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
