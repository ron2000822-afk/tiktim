import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractEventJsonLd, mapJsonLdEventToListingFields } from "./extract-jsonld";

// Structurally identical to real-world schema.org Event JSON-LD (the
// @graph + ComedyEvent shape Israeli ticket sites commonly embed), with
// identifiers replaced by a neutral example domain rather than scraping a
// specific competitor's page into our test fixtures.
const html = readFileSync(join(__dirname, "../__fixtures__/jsonld-comedy-event.html"), "utf-8");

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
