import { describe, expect, it } from "vitest";
import { barbyConnector, parseBarbyDate } from "./barby";
import type { BarbyShow } from "./barby";

// Field shapes/values captured from a real barby.co.il /api/shows/find
// response, but showDate would eventually fall into the past — compute a
// date comfortably in the future instead of hardcoding one.
function futureShowDate(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 86400 * 1000);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
}

function makeShow(overrides: Partial<BarbyShow> = {}): BarbyShow {
  return {
    showId: "5374",
    showDate: futureShowDate(30),
    showTime: "21:00",
    showName: "Amitai Kurtz Samba Project",
    showPrice: "115",
    showSold: 300,
    showSoldMaxBuy: "1000",
    ...overrides,
  };
}

describe("parseBarbyDate", () => {
  it("parses DD/MM/YYYY + HH:MM as a Jerusalem-local instant", () => {
    const date = parseBarbyDate("14/12/2026", "21:00");
    expect(date?.toISOString()).toBe("2026-12-14T19:00:00.000Z"); // IST is UTC+2 in December
  });

  it("returns null for unparseable input", () => {
    expect(parseBarbyDate("not-a-date", "21:00")).toBeNull();
    expect(parseBarbyDate("14/12/2026", "whenever")).toBeNull();
  });
});

describe("barbyConnector.normalize", () => {
  it("normalizes a real show payload", () => {
    const show = makeShow();
    const result = barbyConnector.normalize({ externalId: show.showId, payload: show });
    expect(result).toMatchObject({
      sourceSlug: "barby",
      externalId: "5374",
      title: "Amitai Kurtz Samba Project",
      venueName: "בארבי",
      cityName: "תל אביב",
      categoryHint: "music",
      priceMin: 115,
      priceMax: 115,
      currency: "ILS",
      availability: "available",
      status: "scheduled",
      url: "https://barby.co.il/show/5374",
    });
  });

  it("tags a title with a standup keyword as standup instead of music", () => {
    const show = makeShow({ showName: "ערב סטנדאפ עם גולשים" });
    const result = barbyConnector.normalize({ externalId: show.showId, payload: show });
    expect(result?.categoryHint).toBe("standup");
  });

  it("infers sold_out when sold meets the max-buy cap", () => {
    const show = makeShow({ showSold: 1000, showSoldMaxBuy: "1000" });
    const result = barbyConnector.normalize({ externalId: show.showId, payload: show });
    expect(result?.availability).toBe("sold_out");
  });

  it("infers few_left above the 90% threshold", () => {
    const show = makeShow({ showSold: 950, showSoldMaxBuy: "1000" });
    const result = barbyConnector.normalize({ externalId: show.showId, payload: show });
    expect(result?.availability).toBe("few_left");
  });

  it("rejects a show with no name", () => {
    const show = makeShow({ showName: "" });
    const result = barbyConnector.normalize({ externalId: show.showId, payload: show });
    expect(result).toBeNull();
  });

  it("rejects a show with an unparseable date", () => {
    const show = makeShow({ showDate: "garbage" });
    const result = barbyConnector.normalize({ externalId: show.showId, payload: show });
    expect(result).toBeNull();
  });
});
