import { describe, expect, it } from "vitest";
import { kupatConnector, parseKupatDateTime } from "./kupat";
import type { KupatEvent, KupatRawEvent } from "./kupat";

// Field shapes captured from a real kupat.co.il /api/venues response, but
// Date_Time would eventually fall into the past — compute a date
// comfortably in the future instead of hardcoding one.
function futureDateTime(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 86400 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")} 20:00:00`;
}

function makeEvent(overrides: Partial<KupatEvent> = {}): KupatEvent {
  return {
    Event_ID: 55059,
    Date_Time: futureDateTime(30),
    Feature_Name: "שלמה ארצי",
    Soldout: false,
    Min_Price: 139,
    Max_Price: 199,
    Show: { data: { attributes: { Name: "שלמה ארצי", Show_ID: 2977, Slug: "top_secret" } } },
    ...overrides,
  };
}

function makeRaw(event: KupatEvent, venueName = 'ביתן 2 אקספו ת"א'): KupatRawEvent {
  return { event, venueName };
}

describe("parseKupatDateTime", () => {
  it("parses 'YYYY-MM-DD HH:MM:SS' as a Jerusalem-local instant", () => {
    const date = parseKupatDateTime("2026-12-14 21:00:00");
    expect(date?.toISOString()).toBe("2026-12-14T19:00:00.000Z"); // IST is UTC+2 in December
  });

  it("returns null for missing or unparseable input", () => {
    expect(parseKupatDateTime(undefined)).toBeNull();
    expect(parseKupatDateTime("not-a-date")).toBeNull();
  });
});

describe("kupatConnector.normalize", () => {
  it("normalizes a real event payload, resolving the city from the venue name's quoted abbreviation", () => {
    const event = makeEvent();
    const result = kupatConnector.normalize({ externalId: "55059", payload: makeRaw(event) });
    expect(result).toMatchObject({
      sourceSlug: "kupat",
      externalId: "55059",
      venueName: 'ביתן 2 אקספו ת"א',
      cityName: "תל אביב",
      priceMin: 139,
      priceMax: 199,
      currency: "ILS",
      availability: "available",
      status: "scheduled",
      url: "https://www.kupat.co.il/show/top_secret",
    });
  });

  it("filters out an out-of-scope title (festival) even though it's otherwise well-formed", () => {
    const event = makeEvent({ Feature_Name: "TOP SECRET פסטיגל" });
    const result = kupatConnector.normalize({ externalId: "55059", payload: makeRaw(event) });
    expect(result).toBeNull();
  });

  it("filters out other out-of-scope categories (theater, movies, kids)", () => {
    for (const title of ["הצגת ילדים בתיאטרון", "ערב קולנוע וסרטים", "סיור מודרך במוזיאון"]) {
      const event = makeEvent({ Feature_Name: title });
      const result = kupatConnector.normalize({ externalId: "1", payload: makeRaw(event) });
      expect(result).toBeNull();
    }
  });

  it("tags a title with a standup keyword as standup instead of music", () => {
    const event = makeEvent({ Feature_Name: "ערב סטנדאפ עם כוכבים" });
    const result = kupatConnector.normalize({ externalId: "55059", payload: makeRaw(event) });
    expect(result?.categoryHint).toBe("standup");
  });

  it("defaults to music for a plain artist-name title", () => {
    const event = makeEvent({ Feature_Name: "שלמה ארצי" });
    const result = kupatConnector.normalize({ externalId: "55059", payload: makeRaw(event) });
    expect(result?.categoryHint).toBe("music");
  });

  it("marks sold-out events correctly", () => {
    const event = makeEvent({ Soldout: true });
    const result = kupatConnector.normalize({ externalId: "55059", payload: makeRaw(event) });
    expect(result?.availability).toBe("sold_out");
  });

  it("rejects an event whose show has no slug (can't build a URL)", () => {
    const event = makeEvent({ Show: { data: { attributes: { Name: "שלמה ארצי" } } } });
    const result = kupatConnector.normalize({ externalId: "55059", payload: makeRaw(event) });
    expect(result).toBeNull();
  });

  it("rejects an event with an unparseable date", () => {
    const event = makeEvent({ Date_Time: "garbage" });
    const result = kupatConnector.normalize({ externalId: "55059", payload: makeRaw(event) });
    expect(result).toBeNull();
  });

  it("queues for review when the venue name doesn't resolve to a known city", () => {
    const event = makeEvent();
    const result = kupatConnector.normalize({ externalId: "55059", payload: makeRaw(event, "מקום לא מזוהה") });
    expect(result).toBeNull();
  });
});
