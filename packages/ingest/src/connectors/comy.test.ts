import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { comyConnector, discoverArtistPageUrls, extractPerformances, guessCityFromVenueName, resolveDate } from "./comy";

const FIXTURE_DIR = join(__dirname, "__fixtures__/comy");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, `${name}.html`), "utf-8");
}

describe("discoverArtistPageUrls", () => {
  it("keeps artist page URLs and skips the /event/ hub page", () => {
    const sitemap = `<?xml version="1.0"?>
<urlset>
  <url><loc>https://comy.co.il/event/</loc></url>
  <url><loc>https://comy.co.il/event/adi-ashkenazi/</loc></url>
  <url><loc>https://comy.co.il/event/daniel-hen/</loc></url>
</urlset>`;

    expect(discoverArtistPageUrls(sitemap)).toEqual(["https://comy.co.il/event/adi-ashkenazi/", "https://comy.co.il/event/daniel-hen/"]);
  });
});

describe("extractPerformances", () => {
  it("extracts every bookable date/venue from a real multi-date artist page", () => {
    const html = loadFixture("adi-ashkenazi");
    const performances = extractPerformances(html);

    expect(performances.length).toBeGreaterThan(0);
    expect(performances[0]).toMatchObject({
      artistName: "עדי אשכנזי",
      venueName: "איירפורט סיטי-היכל התרבות",
      day: 10,
      month: 11,
      weekdayLetter: "ג",
      hour: 20,
      minute: 30,
    });
    expect(performances[0].url).toContain("prsntId=55643");
  });

  it("skips not-clickable (sold out) dates that have no real booking link", () => {
    // Confirmed live: assi-azar's page has 7 date rows but only 5 real
    // links — 2 are `href="#"` sold-out placeholders.
    const html = loadFixture("assi-azar");
    const performances = extractPerformances(html);
    expect(performances).toHaveLength(5);
    expect(performances.every((p) => p.url.startsWith("http"))).toBe(true);
  });

  it("handles a page with a single performance date", () => {
    const html = loadFixture("bfunny");
    const performances = extractPerformances(html);
    expect(performances).toHaveLength(2);
    expect(performances[0].artistName).toContain("בי פאני");
  });

  it("returns an empty array when the page has no h1 (not a real artist page)", () => {
    expect(extractPerformances("<html><body>no artist here</body></html>")).toEqual([]);
  });
});

describe("guessCityFromVenueName", () => {
  it("finds a seeded city name embedded in the venue string", () => {
    expect(guessCityFromVenueName("היכל התרבות פתח תקווה")).toBe("פתח תקווה");
    expect(guessCityFromVenueName("אודיטוריום ספיר - כפר סבא")).toBe("כפר סבא");
  });

  it("prefers the longer city name when a shorter one would also match", () => {
    // "תל אביב-יפו" contains "תל אביב" as a substring — must not stop early.
    expect(guessCityFromVenueName("בית החייל - תל אביב")).toBe("תל אביב");
  });

  it("returns undefined for a venue in a town we haven't seeded", () => {
    expect(guessCityFromVenueName("כפר ויתקין")).toBeUndefined();
  });
});

describe("resolveDate", () => {
  const now = new Date("2026-11-10T10:00:00Z");

  it("resolves to the current year when the weekday matches and the date is upcoming", () => {
    // Confirmed: 15.12.2026 is a Tuesday (ג׳, JS day 2).
    const result = resolveDate(15, 12, 20, 30, 2, now);
    expect(result?.toISOString()).toBe(new Date("2026-12-15T18:30:00Z").toISOString());
  });

  it("rolls over to next year when the current year's weekday doesn't match but next year's does", () => {
    // 15.12.2026 is Tuesday, but 15.12.2027 is Wednesday (ד׳, JS day 3).
    const result = resolveDate(15, 12, 20, 30, 3, now);
    expect(result?.getUTCFullYear()).toBe(2027);
  });

  it("returns null when neither candidate year's weekday matches", () => {
    // Neither 15.12.2026 (Tue) nor 15.12.2027 (Wed) is a Thursday (ה׳, JS day 4).
    expect(resolveDate(15, 12, 20, 30, 4, now)).toBeNull();
  });
});

describe("comyConnector.normalize", () => {
  // Computed from the real clock (not hardcoded) so this stays valid no
  // matter when the suite runs: a date 30 days out, with its *actual*
  // weekday letter, is always "upcoming" and always passes the weekday
  // cross-check in resolveDate().
  const HEBREW_WEEKDAY_LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const futureDay = thirtyDaysOut.getUTCDate();
  const futureMonth = thirtyDaysOut.getUTCMonth() + 1;
  const futureWeekdayLetter = HEBREW_WEEKDAY_LETTERS[thirtyDaysOut.getUTCDay()];

  it("normalizes a real performance into a full standup listing", () => {
    const result = comyConnector.normalize({
      externalId: "55643",
      payload: {
        artistName: "עדי אשכנזי",
        venueName: "היכל התרבות פתח תקווה",
        day: futureDay,
        month: futureMonth,
        weekdayLetter: futureWeekdayLetter,
        hour: 20,
        minute: 30,
        url: "https://tickets.comy.co.il/booking/features/2935?prsntId=55643",
      },
    });

    expect(result).toMatchObject({
      sourceSlug: "comy",
      externalId: "55643",
      title: "עדי אשכנזי",
      venueName: "היכל התרבות פתח תקווה",
      cityName: "פתח תקווה",
      categoryHint: "standup",
      currency: "ILS",
      url: "https://tickets.comy.co.il/booking/features/2935?prsntId=55643",
    });
  });

  it("returns null when the weekday letter is unrecognized", () => {
    const result = comyConnector.normalize({
      externalId: "1",
      payload: {
        artistName: "א",
        venueName: "תל אביב",
        day: 10,
        month: 11,
        weekdayLetter: "ת",
        hour: 20,
        minute: 30,
        url: "https://tickets.comy.co.il/booking/features/1?prsntId=1",
      },
    });
    expect(result).toBeNull();
  });

  it("fails validation (and returns null) when no city can be guessed from the venue name", () => {
    const result = comyConnector.normalize({
      externalId: "2",
      payload: {
        artistName: "אמן",
        venueName: "כפר ויתקין",
        day: futureDay,
        month: futureMonth,
        weekdayLetter: futureWeekdayLetter,
        hour: 20,
        minute: 30,
        url: "https://tickets.comy.co.il/booking/features/2?prsntId=2",
      },
    });
    expect(result).toBeNull();
  });
});
