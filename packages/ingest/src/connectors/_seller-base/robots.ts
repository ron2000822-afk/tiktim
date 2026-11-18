import { fetchWithRetry } from "../../lib/http";

type RobotsRules = {
  disallow: string[];
  crawlDelayMs: number | null;
};

const cache = new Map<string, RobotsRules>();
const ROBOTS_TIMEOUT_MS = 10000;

function parseRobotsTxt(text: string): RobotsRules {
  const disallow: string[] = [];
  let crawlDelayMs: number | null = null;
  let inWildcardGroup = false;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      inWildcardGroup = value === "*";
    } else if (inWildcardGroup && key === "disallow" && value) {
      disallow.push(value);
    } else if (inWildcardGroup && key === "crawl-delay") {
      const seconds = Number(value);
      if (!Number.isNaN(seconds)) crawlDelayMs = seconds * 1000;
    }
  }

  return { disallow, crawlDelayMs };
}

async function getRobotsRules(origin: string): Promise<RobotsRules> {
  const cached = cache.get(origin);
  if (cached) return cached;

  let rules: RobotsRules = { disallow: [], crawlDelayMs: null };
  try {
    // Hard deadline, not just a retry cap. A host that resets the HTTP/2
    // stream rather than refusing cleanly leaves the underlying fetch hanging
    // instead of throwing, and because every connector calls this before its
    // first page, one such host stalls that source's entire run with no
    // output at all (confirmed live: zappa-club.co.il, which WAFs even
    // /robots.txt, sat here past 120s).
    const response = await fetchWithRetry(`${origin}/robots.txt`, {
      maxRetries: 1,
      signal: AbortSignal.timeout(ROBOTS_TIMEOUT_MS),
    });
    if (response.ok) rules = parseRobotsTxt(await response.text());
  } catch {
    // No robots.txt, unreachable, or timed out — default to allow, same as
    // most crawlers. Rate limiting still applies via the caller's limiter.
  }

  cache.set(origin, rules);
  return rules;
}

/** Checks whether `path` on `origin` is allowed for our User-Agent per robots.txt (wildcard group only). */
export async function isAllowedByRobots(origin: string, path: string): Promise<boolean> {
  const { disallow } = await getRobotsRules(origin);
  return !disallow.some((rule) => path.startsWith(rule));
}

/** Returns the site's declared Crawl-Delay in ms, if any. */
export async function getCrawlDelayMs(origin: string): Promise<number | null> {
  const { crawlDelayMs } = await getRobotsRules(origin);
  return crawlDelayMs;
}
