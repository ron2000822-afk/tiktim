import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { discoverEntries, extractPayload, grayclubConnector } from "./grayclub";

const FIXTURE_DIR = join(__dirname, "__fixtures__/grayclub");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf-8");
}

describe("grayclubConnector discoverEntries", () => {
  it("extracts event URLs with their numeric externalId, skipping the hub page", () => {
    const sitemap = `<?xml version="1.0"?>
<urlset>
  <url><loc>https://grayclub.co.il/event/</loc><lastmod>2026-11-10T16:56:54+00:00</lastmod></url>
  <url><loc>https://grayclub.co.il/event/103/22561/</loc><lastmod>2026-11-10T11:27:10+00:00</lastmod></url>
  <url><loc>https://grayclub.co.il/event/111/13066/</loc><lastmod>2026-07-21T07:05:00+00:00</lastmod></url>
</urlset>`;

    const entries = discoverEntries(sitemap);

    expect(entries).toEqual([
      { url: "https://grayclub.co.il/event/103/22561/", externalId: "22561", lastmod: "2026-11-10T11:27:10+00:00" },
      { url: "https://grayclub.co.il/event/111/13066/", externalId: "13066", lastmod: "2026-07-21T07:05:00+00:00" },
    ]);
  });
});

describe("grayclubConnector extractPayload", () => {
  it("extracts title, branch, price, date, and address from a real Tel Aviv branch page", () => {
    const html = loadFixture("event-103-22561.html");
    const entry = { url: "https://grayclub.co.il/event/103/22561/", externalId: "22561" };

    const payload = extractPayload(html, entry) as Record<string, unknown>;

    expect(payload).toMatchObject({
      branch: "תלאביב",
      priceAmount: 144,
      doorsTime: "20:00",
      startTime: "22:00",
    });
    expect(payload.title as string).toContain("ירמי עושה אהבה");
    expect(payload.dateText).toContain("13.02.2027");
  });

  it("extracts a different branch (Yehud) correctly", () => {
    const html = loadFixture("event-111-13066.html");
    const entry = { url: "https://grayclub.co.il/event/111/13066/", externalId: "13066" };

    const payload = extractPayload(html, entry) as Record<string, unknown>;

    expect(payload).toMatchObject({ title: "שלומי סרנגה", branch: "יהוד", priceAmount: 179 });
  });

  it("returns null when the page has no h1 or date block (not a real event page)", () => {
    const payload = extractPayload("<html><body>not an event page</body></html>", {
      url: "https://grayclub.co.il/event/1/1/",
      externalId: "1",
    });
    expect(payload).toBeNull();
  });
});

describe("grayclubConnector.normalize", () => {
  const baseItem = {
    externalId: "22561",
    payload: {
      title: "ירמי עושה אהבה",
      branch: "תלאביב",
      priceAmount: 144,
      dateText: "שבת, 13.02.2027",
      doorsTime: "20:00",
      startTime: "22:00",
      address: "אבן גבירול 30",
      _sourceUrl: "https://grayclub.co.il/event/103/22561/",
    },
  };

  it("normalizes a real-shaped payload into a full listing with resolved city", () => {
    const result = grayclubConnector.normalize(baseItem);

    expect(result).toMatchObject({
      sourceSlug: "grayclub",
      externalId: "22561",
      title: "ירמי עושה אהבה",
      venueName: "מועדון הגריי",
      cityName: "תל אביב",
      categoryHint: "music",
      priceMin: 144,
      priceMax: 144,
      currency: "ILS",
      url: "https://grayclub.co.il/event/103/22561/",
    });
    expect(result?.startsAt).toBe(new Date("2027-02-13T22:00:00+02:00").toISOString());
    expect(result?.doorsAt).toBe(new Date("2027-02-13T20:00:00+02:00").toISOString());
  });

  it("maps a title containing standup keywords to the standup category", () => {
    const result = grayclubConnector.normalize({
      ...baseItem,
      payload: { ...baseItem.payload, title: "ערב סטנדאפ עם דני" },
    });
    expect(result?.categoryHint).toBe("standup");
  });

  it("leaves cityName undefined for an unrecognized branch label, failing validation (missing city)", () => {
    const result = grayclubConnector.normalize({
      ...baseItem,
      payload: { ...baseItem.payload, branch: "סניף-לא-מוכר" },
    });
    expect(result).toBeNull();
  });

  it("returns null when there is no parseable date", () => {
    const result = grayclubConnector.normalize({
      ...baseItem,
      payload: { ...baseItem.payload, dateText: "בקרוב" },
    });
    expect(result).toBeNull();
  });
});
