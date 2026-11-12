import { describe, expect, it } from "vitest";
import { eventimConnector } from "./eventim";

// eventim.co.il runs the exact same Eventim platform as zappa-club.co.il
// (confirmed live: identical robots.txt shape, identical
// /staticsite/sitemap/{code}/*.xml.gz layout, just a different
// retail-partner code — EIL vs ZPE) — the shared extraction/normalize
// logic is already covered thoroughly by zappa.test.ts against real
// fixtures. This just confirms eventim.ts is wired to the right
// domain/source, not a copy of zappa's config.
describe("eventimConnector", () => {
  it("is configured for eventim.co.il, not zappa-club.co.il", () => {
    expect(eventimConnector.slug).toBe("eventim");
    expect(eventimConnector.tier).toBe(3);
  });

  it("normalizes a payload shaped like a real Eventim-platform event, tagged with the eventim source and domain", () => {
    const result = eventimConnector.normalize({
      externalId: "123456",
      payload: {
        "@type": "MusicEvent",
        name: "אמן לדוגמה",
        startDate: "2026-12-01T21:00:00.000+02:00",
        location: { name: "אולם לדוגמה", address: { addressLocality: "תל אביב" } },
        performer: { name: "אמן לדוגמה" },
        offers: { price: "150", priceCurrency: "ILS" },
        _sourceUrl: "https://www.eventim.co.il/event/example-123456/",
      },
    });

    expect(result).toMatchObject({
      sourceSlug: "eventim",
      externalId: "123456",
      title: "אמן לדוגמה",
      cityName: "תל אביב",
      priceMin: 150,
      url: "https://www.eventim.co.il/event/example-123456/",
    });
  });

  it("rejects a payload whose URL isn't on eventim.co.il (validateListing's source-domain check)", () => {
    const result = eventimConnector.normalize({
      externalId: "1",
      payload: {
        name: "אמן",
        startDate: "2026-12-01T21:00:00.000+02:00",
        location: { name: "אולם", address: { addressLocality: "תל אביב" } },
        _sourceUrl: "https://www.zappa-club.co.il/event/wrong-domain/",
      },
    });
    expect(result).toBeNull();
  });
});
