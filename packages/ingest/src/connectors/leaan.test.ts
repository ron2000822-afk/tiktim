import { describe, expect, it } from "vitest";
import { leaanConnector } from "./leaan";
import musicEventFixture from "./__fixtures__/leaan-music.json";
import standupEventFixture from "./__fixtures__/leaan-standup.json";
import kidsEventFixture from "./__fixtures__/leaan-kids-filtered.json";

// Fixtures capture real field shapes/values from a live leaan.co.il event
// page's embedded __NEXT_DATA__, but event_start/event_end are Unix
// timestamps that will eventually fall into the past — rebase them to stay
// comfortably in the future regardless of when these tests run.
function withFutureDates<T extends { event_start: number; event_end: number }>(fixture: T): T {
  const daysFromNow = (days: number) => Math.floor(Date.now() / 1000) + days * 86400;
  return { ...fixture, event_start: daysFromNow(14), event_end: daysFromNow(14) + 3600 };
}

describe("leaanConnector.normalize", () => {
  it("normalizes a music event", () => {
    const fixture = withFutureDates(musicEventFixture);
    const result = leaanConnector.normalize({ externalId: String(fixture.id), payload: fixture });
    expect(result).toMatchObject({
      sourceSlug: "leaan",
      externalId: "6182",
      title: "מיקי גבע",
      venueName: "בית מקומי לתרבות, הוד השרון",
      cityName: "הוד השרון",
      categoryHint: "music",
      priceMin: 129,
      currency: "ILS",
      availability: "available",
      status: "scheduled",
    });
    expect(result?.url).toBe(fixture._sourceUrl);
  });

  it("maps the shared entertainment category to standup when the title says so", () => {
    const fixture = withFutureDates(standupEventFixture);
    const result = leaanConnector.normalize({ externalId: String(fixture.id), payload: fixture });
    expect(result?.categoryHint).toBe("standup");
  });

  it("defaults the shared entertainment category to music when the title has no standup keyword", () => {
    const fixture = withFutureDates({ ...standupEventFixture, event_name: "להקת כנסית השכל", name: "להקת כנסית השכל" });
    const result = leaanConnector.normalize({ externalId: String(fixture.id), payload: fixture });
    expect(result?.categoryHint).toBe("music");
  });

  it("filters out categories outside V1 scope (e.g. kids)", () => {
    const fixture = withFutureDates(kidsEventFixture);
    const result = leaanConnector.normalize({ externalId: String(fixture.id), payload: fixture });
    expect(result).toBeNull();
  });

  it("skips an inactive event", () => {
    const fixture = withFutureDates({ ...musicEventFixture, active: false });
    const result = leaanConnector.normalize({ externalId: String(fixture.id), payload: fixture });
    expect(result).toBeNull();
  });

  it("marks a sold-out event as such instead of dropping it", () => {
    const fixture = withFutureDates({ ...musicEventFixture, sold_out: true });
    const result = leaanConnector.normalize({ externalId: String(fixture.id), payload: fixture });
    expect(result?.availability).toBe("sold_out");
  });

  it("rejects an event whose start time has already passed by more than 6 hours", () => {
    const sevenHoursAgo = Math.floor(Date.now() / 1000) - 7 * 3600;
    const fixture = { ...musicEventFixture, event_start: sevenHoursAgo, event_end: sevenHoursAgo + 3600 };
    const result = leaanConnector.normalize({ externalId: String(fixture.id), payload: fixture });
    expect(result).toBeNull();
  });

  it("skips an event with no venue name", () => {
    const fixture = withFutureDates({ ...musicEventFixture, location: { ...musicEventFixture.location, name: "" } });
    const result = leaanConnector.normalize({ externalId: String(fixture.id), payload: fixture });
    expect(result).toBeNull();
  });
});
