import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractEventJsonLd, extractPriceRange, mapJsonLdEventToListingFields } from "./extract-jsonld";

// Structurally identical to real-world schema.org Event JSON-LD (the
// @graph + ComedyEvent shape Israeli ticket sites commonly embed), with
// identifiers replaced by a neutral example domain rather than scraping a
// specific competitor's page into our test fixtures.
const html = readFileSync(join(__dirname, "../__fixtures__/jsonld-comedy-event.html"), "utf-8");
const eventSeriesHtml = readFileSync(join(__dirname, "../__fixtures__/zappa/yuval-dayan-eventseries.html"), "utf-8");

describe("extractEventJsonLd", () => {
  it("finds the Event node inside an @graph, ignoring non-event nodes", () => {
    const events = extractEventJsonLd(html);
    expect(events).toHaveLength(1);
    expect(events[0]["@type"]).toBe("ComedyEvent");
  });

  it("returns an empty array for a page with no JSON-LD", () => {
    expect(extractEventJsonLd("<html><body>no structured data here</body></html>")).toEqual([]);
  });

  it("skips malformed JSON-LD without throwing", () => {
    const broken = `<script type="application/ld+json">{not valid json</script>`;
    expect(extractEventJsonLd(broken)).toEqual([]);
  });

  it("expands an EventSeries' subEvent array into individual listings (confirmed live on zappa-club.co.il's artist pages)", () => {
    const events = extractEventJsonLd(eventSeriesHtml);
    expect(events).toHaveLength(3);
    expect(events.every((e) => e["@type"] === "MusicEvent")).toBe(true);
    expect(events.map((e) => (e.location as Record<string, unknown>).name)).toEqual(["זאפה חיפה", "זאפה ירושלים", "זאפה הרצליה"]);
  });
});

describe("mapJsonLdEventToListingFields", () => {
  it("maps a schema.org Event node to NormalizedListing-shaped fields", () => {
    const [event] = extractEventJsonLd(html);
    const fields = mapJsonLdEventToListingFields(event);

    expect(fields).toMatchObject({
      title: "ארז שלם סטנדאפ",
      startsAt: "2026-11-02T21:00:00+02:00",
      venueName: "מוזיאון פתח תקוה לאמנות- תיאטרון הדופן",
      cityName: "פתח תקווה",
      address: "חיים ארלוזורוב 30, פתח תקווה, ישראל",
      artistNames: ["ארז שלם"],
      status: "scheduled",
    });
    expect(fields.lat).toBeCloseTo(32.0851786);
    expect(fields.lng).toBeCloseTo(34.8724796);
  });
});

describe("extractPriceRange", () => {
  it("reads a single Offer's price as both min and max", () => {
    const event = { offers: { "@type": "Offer", price: "229", priceCurrency: "ILS" } };
    expect(extractPriceRange(event)).toEqual({ min: 229, max: 229, currency: "ILS" });
  });

  it("reads lowPrice/highPrice from an AggregateOffer", () => {
    const event = { offers: { "@type": "AggregateOffer", lowPrice: "100", highPrice: "300", priceCurrency: "ILS" } };
    expect(extractPriceRange(event)).toEqual({ min: 100, max: 300, currency: "ILS" });
  });

  it("takes the min and max across an array of per-tier Offers", () => {
    const event = {
      offers: [
        { "@type": "Offer", price: 150, priceCurrency: "ILS" },
        { "@type": "Offer", price: 450, priceCurrency: "ILS" },
        { "@type": "Offer", price: 300, priceCurrency: "ILS" },
      ],
    };
    expect(extractPriceRange(event)).toEqual({ min: 150, max: 450, currency: "ILS" });
  });

  it("returns null when there are no offers", () => {
    expect(extractPriceRange({})).toBeNull();
  });

  it("finds a price nested two levels down in itemOffered.offers (confirmed live on zappa-club.co.il)", () => {
    const event = {
      offers: [
        {
          "@type": "AggregateOffer",
          priceCurrency: "ILS",
          availability: "https://schema.org/InStock",
          itemOffered: {
            "@type": "Product",
            offers: [{ "@type": "Offer", category: "ישיבה לא מסומן", price: "159.00", priceCurrency: "ILS" }],
          },
        },
      ],
    };
    expect(extractPriceRange(event)).toEqual({ min: 159, max: 159, currency: "ILS" });
  });

  it("returns null when the Offer has no price, low/high price fields", () => {
    const event = { offers: { "@type": "Offer", priceCurrency: "ILS", availability: "https://schema.org/InStock" } };
    expect(extractPriceRange(event)).toBeNull();
  });
});
