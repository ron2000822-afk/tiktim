import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractEventJsonLd } from "./_seller-base/extract-jsonld";
import { zappaConnector } from "./zappa";

const FIXTURE_DIR = join(__dirname, "__fixtures__/zappa");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf-8");
}

// These exercise normalize() directly against payload shapes taken from real
// fixture HTML (see the fixture files) rather than running fetch() live —
// zappa-club.co.il is unreachable from this environment (confirmed: every
// request times out, consistent with a geo-block to non-Israeli IPs), so
// the fetch()/sitemap-discovery path could not be dry-run against the real
// site the way comy.co.il and grayclub.co.il were.
describe("zappaConnector.normalize", () => {
  it("normalizes a real single-event page (Guri Alfi, standup) with a price nested in itemOffered.offers", () => {
    const html = loadFixture("guri-alfi-jerusalem.html");
    const [event] = extractEventJsonLd(html);
    const offers = Array.isArray(event.offers) ? event.offers : [event.offers];
    const offerUrl = (offers[0] as Record<string, unknown>).url as string;

    const result = zappaConnector.normalize({
      externalId: "22033115",
      payload: { ...event, _sourceUrl: offerUrl },
    });

    expect(result).toMatchObject({
      sourceSlug: "zappa",
      externalId: "22033115",
      title: "גורי אלפי",
      venueName: "זאפה ירושלים",
      cityName: "ירושלים",
      address: "דרך חברון 28,ירושלים",
      categoryHint: "standup",
      priceMin: 159,
      priceMax: 159,
      currency: "ILS",
      status: "scheduled",
      url: "https://www.zappa-club.co.il/event/גורי-אלפי-זאפה-ירושלים-22033115/",
    });
    expect(result?.startsAt).toBe("2026-11-12T21:30:00.000+02:00");
  });

  it("normalizes each subEvent of a real EventSeries page (Yuval Dayan, music) as its own listing with its own URL", () => {
    const html = loadFixture("yuval-dayan-eventseries.html");
    const events = extractEventJsonLd(html);
    expect(events).toHaveLength(3);

    const results = events.map((event, i) => {
      const offers = Array.isArray(event.offers) ? event.offers : [event.offers];
      const offerUrl = (offers[0] as Record<string, unknown>).url as string;
      return zappaConnector.normalize({ externalId: String(21865177 + i), payload: { ...event, _sourceUrl: offerUrl } });
    });

    expect(results.map((r) => r?.cityName)).toEqual(["חיפה", "ירושלים", "הרצליה"]);
    expect(results.map((r) => r?.venueName)).toEqual(["זאפה חיפה", "זאפה ירושלים", "זאפה הרצליה"]);
    expect(results.every((r) => r?.categoryHint === "music")).toBe(true);
    // Confirmed live: these three subEvents' offers had no price field at
    // all (priceAvailable: false in the page's own calendar data) — must
    // degrade gracefully to no price, not fail validation or crash.
    expect(results.every((r) => r?.priceMin === undefined)).toBe(true);
    expect(results.every((r) => r !== null)).toBe(true);
  });

  it("returns null when required fields (title/startsAt/venueName) are missing", () => {
    const result = zappaConnector.normalize({ externalId: "1", payload: { _sourceUrl: "https://www.zappa-club.co.il/event/x/" } });
    expect(result).toBeNull();
  });
});
