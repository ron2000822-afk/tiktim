import { describe, expect, it, vi } from "vitest";
import { ticketmasterConnector } from "./ticketmaster";
import musicEvent from "./__fixtures__/ticketmaster-event.json";
import standupEvent from "./__fixtures__/ticketmaster-standup.json";
import sportsEvent from "./__fixtures__/ticketmaster-sports.json";

const { fetchWithRetryMock } = vi.hoisted(() => ({ fetchWithRetryMock: vi.fn() }));

vi.mock("../lib/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/http")>();
  return { ...actual, fetchWithRetry: fetchWithRetryMock };
});

function textResponse(body: string, ok = true) {
  return { ok, text: async () => body } as Response;
}

const EMPTY_ROBOTS_TXT = "User-agent: *\n";
const EVENT_PAGE_WITH_PRICE = `<html><script type="application/ld+json">${JSON.stringify({
  "@type": "MusicEvent",
  name: "Celtic Throne",
  offers: { "@type": "Offer", price: "229", priceCurrency: "ILS" },
})}</script></html>`;

describe("ticketmasterConnector.normalize", () => {
  it("normalizes a music event with full details", () => {
    const result = ticketmasterConnector.normalize({ externalId: musicEvent.id, payload: musicEvent });
    expect(result).toMatchObject({
      sourceSlug: "ticketmaster",
      externalId: "vvG1HZ9eErfLmp",
      artistNames: ["Shlomo Artzi"],
      venueName: "Menora Mivtachim Arena",
      cityName: "Tel Aviv-Yafo",
      categoryHint: "music",
      priceMin: 150,
      priceMax: 450,
      currency: "ILS",
      availability: "available",
      status: "scheduled",
    });
    expect(result?.imageUrl).toBe("https://s1.ticketm.net/dam/a/large.jpg");
    expect(result?.lat).toBeCloseTo(32.0809);
  });

  it("maps Arts & Theatre + Comedy genre to the standup category", () => {
    const result = ticketmasterConnector.normalize({ externalId: standupEvent.id, payload: standupEvent });
    expect(result?.categoryHint).toBe("standup");
    expect(result?.artistNames).toEqual(["Adir Miller"]);
  });

  it("filters out non-music/standup categories (e.g. sports)", () => {
    const result = ticketmasterConnector.normalize({ externalId: sportsEvent.id, payload: sportsEvent });
    expect(result).toBeNull();
  });

  it("skips an event with no venue or no start time", () => {
    const broken = { ...musicEvent, _embedded: {} };
    const result = ticketmasterConnector.normalize({ externalId: broken.id, payload: broken });
    expect(result).toBeNull();
  });

  it("builds an Impact affiliate URL when publisher id and campaign are configured", () => {
    process.env.IMPACT_TICKETMASTER_PUBLISHER_ID = "12345";
    const url = ticketmasterConnector.buildAffiliateUrl?.("https://ticketmaster.co.il/event/x", { impactCampaignId: "999" });
    expect(url).toContain("pid=12345");
    expect(url).toContain("camp=999");
    delete process.env.IMPACT_TICKETMASTER_PUBLISHER_ID;
  });

  it("falls back to the plain URL when affiliate config is missing", () => {
    const url = ticketmasterConnector.buildAffiliateUrl?.("https://ticketmaster.co.il/event/x", {});
    expect(url).toBe("https://ticketmaster.co.il/event/x");
  });
});

describe("ticketmasterConnector.enrichPrice", () => {
  const listing = {
    sourceSlug: "ticketmaster",
    externalId: "abc123",
    title: "Celtic Throne",
    artistNames: ["Celtic Throne"],
    venueName: "Red Note Club",
    startsAt: "2026-11-06T11:30:00Z",
    url: "https://www.ticketmaster.co.il/event/MIO15/ALL/en",
  };

  it("reads a real price from the event page's JSON-LD when the Discovery API gave none", async () => {
    fetchWithRetryMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/robots.txt")) return textResponse(EMPTY_ROBOTS_TXT);
      return textResponse(EVENT_PAGE_WITH_PRICE);
    });

    const result = await ticketmasterConnector.enrichPrice?.(listing);

    expect(result).toEqual({ priceMin: 229, priceMax: 229, currency: "ILS" });
  });

  it("returns null when the event page has no JSON-LD price", async () => {
    fetchWithRetryMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/robots.txt")) return textResponse(EMPTY_ROBOTS_TXT);
      return textResponse("<html><body>no structured data</body></html>");
    });

    const result = await ticketmasterConnector.enrichPrice?.(listing);

    expect(result).toBeNull();
  });

  it("returns null without fetching the page when robots.txt disallows the path", async () => {
    fetchWithRetryMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/robots.txt")) return textResponse("User-agent: *\nDisallow: /event/\n");
      throw new Error(`should not fetch: ${url}`);
    });

    const result = await ticketmasterConnector.enrichPrice?.(listing);

    expect(result).toBeNull();
  });

  it("returns null (never throws) when the page fetch fails", async () => {
    fetchWithRetryMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/robots.txt")) return textResponse(EMPTY_ROBOTS_TXT);
      throw new Error("network down");
    });

    const result = await ticketmasterConnector.enrichPrice?.(listing);

    expect(result).toBeNull();
  });
});
