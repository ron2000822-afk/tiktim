import { describe, expect, it } from "vitest";
import { tomixConnector, discoverProductSitemapUrls, discoverRecentProductUrls, extractShowDetails } from "./tomix";

describe("discoverProductSitemapUrls", () => {
  it("picks only numbered product-sitemap entries from the sitemap index", () => {
    const xml = `<sitemapindex>
      <sitemap><loc>https://www.to-mix.co.il/post-sitemap.xml</loc></sitemap>
      <sitemap><loc>https://www.to-mix.co.il/product-sitemap.xml</loc></sitemap>
      <sitemap><loc>https://www.to-mix.co.il/product-sitemap5.xml</loc></sitemap>
      <sitemap><loc>https://www.to-mix.co.il/product_cat-sitemap.xml</loc></sitemap>
    </sitemapindex>`;
    expect(discoverProductSitemapUrls(xml)).toEqual([
      "https://www.to-mix.co.il/product-sitemap.xml",
      "https://www.to-mix.co.il/product-sitemap5.xml",
    ]);
  });
});

describe("discoverRecentProductUrls", () => {
  const now = new Date("2026-11-17T00:00:00Z");

  it("keeps URLs whose lastmod is within the recency window", () => {
    const xml = `<urlset>
      <url><loc>https://www.to-mix.co.il/product/recent/</loc><lastmod>2026-11-10T00:00:00+00:00</lastmod></url>
      <url><loc>https://www.to-mix.co.il/product/old/</loc><lastmod>2023-01-01T00:00:00+00:00</lastmod></url>
    </urlset>`;
    expect(discoverRecentProductUrls(xml, now)).toEqual(["https://www.to-mix.co.il/product/recent/"]);
  });
});

describe("extractShowDetails", () => {
  it("extracts a real show's title/date/time/place", () => {
    const html = `<h1 class="mix-main-title">רותם כהן</h1>
      <span class="span-mixtempdate">יום חמישי, 17.12</span><span class="span-mixtemptime">21:30</span><span class="span-mixplace"><a href="#">UP Town - פארק עתידים, תל אביב</a></span>`;
    expect(extractShowDetails(html, "https://www.to-mix.co.il/product/rotem_cohen/")).toEqual({
      title: "רותם כהן",
      weekdayName: "חמישי",
      day: 17,
      month: 12,
      hour: 21,
      minute: 30,
      venueName: "UP Town - פארק עתידים, תל אביב",
      url: "https://www.to-mix.co.il/product/rotem_cohen/",
    });
  });

  it("handles a weekday without the 'יום' prefix, and a dash-separated venue/city with no comma", () => {
    const html = `<h1 class="mix-main-title">אשר סויסה</h1>
      <span class="span-mixtempdate">שישי, 27.11</span><span class="span-mixtemptime">21:00</span><span class="span-mixplace"><a href="#">tox - ראשון לציון</a></span>`;
    const result = extractShowDetails(html, "https://www.to-mix.co.il/product/asher/");
    expect(result?.weekdayName).toBe("שישי");
    expect(result?.venueName).toBe("tox - ראשון לציון");
  });

  it("returns null for a merchandise product with no date/time/place", () => {
    const html = `<h1 class="mix-main-title">חולצת ליינאפ ג'נסיס</h1>`;
    expect(extractShowDetails(html, "https://www.to-mix.co.il/product/shirt/")).toBeNull();
  });
});

const WEEKDAY_TO_DOW: Record<string, number> = { ראשון: 0, שני: 1, שלישי: 2, רביעי: 3, חמישי: 4, שישי: 5, שבת: 6 };

function weekdayNameFor(date: Date): string {
  const dow = date.getUTCDay();
  return Object.entries(WEEKDAY_TO_DOW).find(([, d]) => d === dow)![0];
}

describe("tomixConnector.normalize", () => {
  it("normalizes a real show, resolving the city from a comma-separated venue string", () => {
    const d = new Date(Date.now() + 30 * 86400 * 1000);
    const payload = {
      title: "רותם כהן",
      weekdayName: weekdayNameFor(d),
      day: d.getUTCDate(),
      month: d.getUTCMonth() + 1,
      hour: 21,
      minute: 30,
      venueName: "UP Town - פארק עתידים, תל אביב",
      url: "https://www.to-mix.co.il/product/rotem_cohen/",
    };
    const result = tomixConnector.normalize({ externalId: payload.url, payload });
    expect(result).toMatchObject({
      sourceSlug: "tomix",
      title: "רותם כהן",
      venueName: "UP Town - פארק עתידים, תל אביב",
      cityName: "תל אביב",
      categoryHint: "music",
      currency: "ILS",
      availability: "available",
      status: "scheduled",
      url: "https://www.to-mix.co.il/product/rotem_cohen/",
    });
  });

  it("resolves the city from a dash-separated venue string with no comma at all", () => {
    const d = new Date(Date.now() + 30 * 86400 * 1000);
    const payload = {
      title: "אשר סויסה",
      weekdayName: weekdayNameFor(d),
      day: d.getUTCDate(),
      month: d.getUTCMonth() + 1,
      hour: 22,
      minute: 0,
      venueName: "tox - ראשון לציון",
      url: "https://www.to-mix.co.il/product/asher/",
    };
    const result = tomixConnector.normalize({ externalId: payload.url, payload });
    expect(result?.cityName).toBe("ראשון לציון");
  });

  it("tags a standup-keyword title as standup", () => {
    const d = new Date(Date.now() + 30 * 86400 * 1000);
    const payload = {
      title: "ערב סטנדאפ",
      weekdayName: weekdayNameFor(d),
      day: d.getUTCDate(),
      month: d.getUTCMonth() + 1,
      hour: 21,
      minute: 0,
      venueName: "UP Town - פארק עתידים, תל אביב",
      url: "https://www.to-mix.co.il/product/standup-night/",
    };
    const result = tomixConnector.normalize({ externalId: payload.url, payload });
    expect(result?.categoryHint).toBe("standup");
  });

  it("rejects a payload with an unrecognized weekday name", () => {
    const payload = {
      title: "רותם כהן",
      weekdayName: "garbage",
      day: 17,
      month: 12,
      hour: 21,
      minute: 30,
      venueName: "UP Town - פארק עתידים, תל אביב",
      url: "https://www.to-mix.co.il/product/rotem_cohen/",
    };
    const result = tomixConnector.normalize({ externalId: payload.url, payload });
    expect(result).toBeNull();
  });
});
