import { describe, expect, it } from "vitest";
import { validateListing } from "./validate-listing";
import type { NormalizedListing } from "../types";

function baseListing(overrides: Partial<NormalizedListing> = {}): NormalizedListing {
  const inTwoWeeks = new Date(Date.now() + 14 * 86400_000).toISOString();
  return {
    sourceSlug: "example",
    externalId: "1",
    title: "מופע בדיקה",
    artistNames: ["אמן בדיקה"],
    venueName: "אולם בדיקה",
    cityName: "תל אביב",
    startsAt: inTwoWeeks,
    url: "https://www.example-seller.test/events/1",
    ...overrides,
  };
}

describe("validateListing", () => {
  const domain = "example-seller.test";

  it("accepts a well-formed future listing on the source domain", () => {
    expect(validateListing(baseListing(), domain)).toEqual({ valid: true });
  });

  it("rejects an empty title", () => {
    const result = validateListing(baseListing({ title: "   " }), domain);
    expect(result.valid).toBe(false);
  });

  it("rejects a start time more than 6h in the past", () => {
    const sevenHoursAgo = new Date(Date.now() - 7 * 3600_000).toISOString();
    const result = validateListing(baseListing({ startsAt: sevenHoursAgo }), domain);
    expect(result.valid).toBe(false);
  });

  it("accepts a start time within the last 6h (show likely still running)", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600_000).toISOString();
    const result = validateListing(baseListing({ startsAt: threeHoursAgo }), domain);
    expect(result.valid).toBe(true);
  });

  it("rejects a price above 3000 ILS", () => {
    const result = validateListing(baseListing({ priceMax: 5000 }), domain);
    expect(result.valid).toBe(false);
  });

  it("rejects a negative price", () => {
    const result = validateListing(baseListing({ priceMin: -10 }), domain);
    expect(result.valid).toBe(false);
  });

  it("rejects a URL on a different domain than the source", () => {
    const result = validateListing(baseListing({ url: "https://some-other-site.test/x" }), domain);
    expect(result.valid).toBe(false);
  });

  it("rejects a missing city", () => {
    const result = validateListing(baseListing({ cityName: undefined }), domain);
    expect(result.valid).toBe(false);
  });
});
