import { describe, expect, it } from "vitest";
import { ticketmasterConnector } from "./ticketmaster";
import musicEvent from "./__fixtures__/ticketmaster-event.json";
import standupEvent from "./__fixtures__/ticketmaster-standup.json";
import sportsEvent from "./__fixtures__/ticketmaster-sports.json";

describe("ticketmasterConnector.normalize", () => {
  it("normalizes a music event with full details", () => {
    const result = ticketmasterConnector.normalize({ externalId: musicEvent.id, payload: musicEvent });
    expect(result).toMatchObject({
      sourceSlug: "ticketmaster",
      externalId: "vvG1HZ9eErfLmp",
      artistNames: ["Shlomo Artzi"],
      venueName: "Menora Mivtachim Arena",
      cityName: "Tel Aviv-Yafo",
      categoryHint: "music",
      priceMin: 150,
      priceMax: 450,
      currency: "ILS",
      availability: "available",
      status: "scheduled",
    });
    expect(result?.imageUrl).toBe("https://s1.ticketm.net/dam/a/large.jpg");
    expect(result?.lat).toBeCloseTo(32.0809);
  });

  it("maps Arts & Theatre + Comedy genre to the standup category", () => {
    const result = ticketmasterConnector.normalize({ externalId: standupEvent.id, payload: standupEvent });
    expect(result?.categoryHint).toBe("standup");
    expect(result?.artistNames).toEqual(["Adir Miller"]);
  });

  it("filters out non-music/standup categories (e.g. sports)", () => {
    const result = ticketmasterConnector.normalize({ externalId: sportsEvent.id, payload: sportsEvent });
    expect(result).toBeNull();
  });

  it("skips an event with no venue or no start time", () => {
    const broken = { ...musicEvent, _embedded: {} };
    const result = ticketmasterConnector.normalize({ externalId: broken.id, payload: broken });
    expect(result).toBeNull();
  });

  it("builds an Impact affiliate URL when publisher id and campaign are configured", () => {
    process.env.IMPACT_TICKETMASTER_PUBLISHER_ID = "12345";
    const url = ticketmasterConnector.buildAffiliateUrl?.("https://ticketmaster.co.il/event/x", { impactCampaignId: "999" });
    expect(url).toContain("pid=12345");
    expect(url).toContain("camp=999");
    delete process.env.IMPACT_TICKETMASTER_PUBLISHER_ID;
  });

  it("falls back to the plain URL when affiliate config is missing", () => {
    const url = ticketmasterConnector.buildAffiliateUrl?.("https://ticketmaster.co.il/event/x", {});
    expect(url).toBe("https://ticketmaster.co.il/event/x");
  });
});
