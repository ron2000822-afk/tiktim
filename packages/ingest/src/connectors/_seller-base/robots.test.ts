import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCrawlDelayMs, isAllowedByRobots } from "./robots";

let originCounter = 0;
// A fresh origin per test avoids collisions with this module's internal robots.txt cache.
function freshOrigin() {
  return `https://robots-test-${originCounter++}.example`;
}

function mockRobotsTxt(text: string | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      text === null
        ? new Response("", { status: 404 })
        : new Response(text, { status: 200 }),
    ),
  );
}

describe("isAllowedByRobots / getCrawlDelayMs", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("disallows a path matched by a wildcard User-agent Disallow rule", async () => {
    mockRobotsTxt("User-agent: *\nDisallow: /personal-area\n");
    const origin = freshOrigin();
    await expect(isAllowedByRobots(origin, "/personal-area/orders")).resolves.toBe(false);
  });

  it("allows a path not covered by any Disallow rule", async () => {
    mockRobotsTxt("User-agent: *\nDisallow: /personal-area\n");
    const origin = freshOrigin();
    await expect(isAllowedByRobots(origin, "/events/some-show")).resolves.toBe(true);
  });

  it("defaults to allow when robots.txt is missing (404)", async () => {
    mockRobotsTxt(null);
    const origin = freshOrigin();
    await expect(isAllowedByRobots(origin, "/anything")).resolves.toBe(true);
  });

  it("reads a declared Crawl-Delay in seconds and converts to ms", async () => {
    mockRobotsTxt("User-agent: *\nCrawl-Delay: 20\n");
    const origin = freshOrigin();
    await expect(getCrawlDelayMs(origin)).resolves.toBe(20_000);
  });

  it("returns null when no Crawl-Delay is declared", async () => {
    mockRobotsTxt("User-agent: *\nDisallow: /x\n");
    const origin = freshOrigin();
    await expect(getCrawlDelayMs(origin)).resolves.toBeNull();
  });

  it("ignores Disallow rules under a different (non-wildcard) User-agent group", async () => {
    mockRobotsTxt("User-agent: SomeOtherBot\nDisallow: /events\n\nUser-agent: *\nDisallow: /admin\n");
    const origin = freshOrigin();
    await expect(isAllowedByRobots(origin, "/events/some-show")).resolves.toBe(true);
  });
});
