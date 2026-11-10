import { describe, expect, it, vi } from "vitest";
import { findArtistImage } from "./find-artist-image";

const { fetchWithRetryMock } = vi.hoisted(() => ({ fetchWithRetryMock: vi.fn() }));

vi.mock("../lib/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/http")>();
  return { ...actual, fetchWithRetry: fetchWithRetryMock };
});

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe("findArtistImage", () => {
  it("returns the Hebrew Wikipedia photo with credit + license when found", async () => {
    fetchWithRetryMock.mockImplementation(async (url: string) => {
      if (url.includes("he.wikipedia.org")) {
        return jsonResponse({
          query: { pages: { "1": { original: { source: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Some_Artist.jpg?utm_source=he.wikipedia.org" } } } },
        });
      }
      if (url.includes("commons.wikimedia.org")) {
        return jsonResponse({
          query: {
            pages: {
              "2": {
                imageinfo: [{ extmetadata: { Artist: { value: '<a href="#">Jane Photographer</a>' }, LicenseShortName: { value: "CC BY-SA 3.0" } } }],
              },
            },
          },
        });
      }
      throw new Error(`unexpected url: ${url}`);
    });

    const result = await findArtistImage("עידן רייכל");

    expect(result).toEqual({
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Some_Artist.jpg?utm_source=he.wikipedia.org",
      imageCredit: "Jane Photographer",
      imageLicense: "CC BY-SA 3.0",
      matchedTitle: "עידן רייכל",
      confidence: "exact",
    });
  });

  it("falls back to English Wikipedia when Hebrew has no page image", async () => {
    fetchWithRetryMock.mockImplementation(async (url: string) => {
      if (url.includes("he.wikipedia.org")) {
        return jsonResponse({ query: { pages: { "-1": {} } } });
      }
      if (url.includes("en.wikipedia.org")) {
        return jsonResponse({
          query: { pages: { "1": { original: { source: "https://upload.wikimedia.org/wikipedia/commons/b/bc/EN_Artist.jpg" } } } },
        });
      }
      if (url.includes("commons.wikimedia.org")) {
        return jsonResponse({
          query: { pages: { "2": { imageinfo: [{ extmetadata: { LicenseShortName: { value: "CC BY 4.0" } } }] } } },
        });
      }
      throw new Error(`unexpected url: ${url}`);
    });

    const result = await findArtistImage("Some International Artist");

    expect(result).toEqual({
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/bc/EN_Artist.jpg",
      imageCredit: "Wikimedia Commons",
      imageLicense: "CC BY 4.0",
      matchedTitle: "Some International Artist",
      confidence: "exact",
    });
  });

  it("falls back to full-text search when no exact-title page exists, flagged as confidence: search", async () => {
    fetchWithRetryMock.mockImplementation(async (url: string) => {
      if (url.includes("list=search")) {
        if (url.includes("he.wikipedia.org")) {
          return jsonResponse({ query: { search: [{ title: "שי זלמן (זמר)" }] } });
        }
        throw new Error(`unexpected search url: ${url}`);
      }
      if (url.includes("en.wikipedia.org")) {
        // exact-title lookup on the English wiki for the raw artist name — no page.
        return jsonResponse({ query: { pages: { "-1": {} } } });
      }
      if (url.includes("he.wikipedia.org")) {
        if (url.includes(encodeURIComponent("שי זלמן (זמר)"))) {
          // exact-title lookup for the search-matched title — has a page image.
          return jsonResponse({
            query: { pages: { "1": { title: "שי זלמן (זמר)", original: { source: "https://upload.wikimedia.org/wikipedia/commons/d/de/Shai.jpg" } } } },
          });
        }
        // exact-title lookup for the raw artist name — no page.
        return jsonResponse({ query: { pages: { "-1": {} } } });
      }
      if (url.includes("commons.wikimedia.org")) {
        return jsonResponse({
          query: { pages: { "2": { imageinfo: [{ extmetadata: { Artist: { value: "Some Photographer" }, LicenseShortName: { value: "CC BY 2.0" } } }] } } },
        });
      }
      throw new Error(`unexpected url: ${url}`);
    });

    const result = await findArtistImage("שי זלמן");

    expect(result).toEqual({
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/de/Shai.jpg",
      imageCredit: "Some Photographer",
      imageLicense: "CC BY 2.0",
      matchedTitle: "שי זלמן (זמר)",
      confidence: "search",
    });
  });

  it("returns null when neither wiki has a page image", async () => {
    fetchWithRetryMock.mockImplementation(async () => jsonResponse({ query: { pages: { "-1": {} } } }));

    const result = await findArtistImage("שם לא קיים לגמרי");

    expect(result).toBeNull();
  });

  it("returns null when Commons has no license metadata, rather than using an unattributable image", async () => {
    fetchWithRetryMock.mockImplementation(async (url: string) => {
      if (url.includes("he.wikipedia.org")) {
        return jsonResponse({
          query: { pages: { "1": { original: { source: "https://upload.wikimedia.org/wikipedia/commons/c/cd/No_License.jpg" } } } },
        });
      }
      if (url.includes("en.wikipedia.org")) {
        return jsonResponse({ query: { pages: { "-1": {} } } });
      }
      if (url.includes("commons.wikimedia.org")) {
        return jsonResponse({ query: { pages: { "2": { imageinfo: [{ extmetadata: {} }] } } } });
      }
      throw new Error(`unexpected url: ${url}`);
    });

    const result = await findArtistImage("Artist With Unlicensed Photo");

    expect(result).toBeNull();
  });

  it("rejects a page image from a disambiguation/name-list page rather than an unrelated photo", async () => {
    // Confirmed live: the real artist "Nasrin" matched a Wikipedia page
    // titled "Nasrin" that's a "Name list" page, not about her — its page
    // image was an unrelated flower photo. The formal __DISAMBIG__ flag
    // didn't catch it; the Wikidata short description did.
    fetchWithRetryMock.mockImplementation(async (url: string) => {
      if (url.includes("he.wikipedia.org")) {
        return jsonResponse({ query: { pages: { "-1": {} } } });
      }
      if (url.includes("en.wikipedia.org")) {
        return jsonResponse({
          query: {
            pages: {
              "1": {
                original: { source: "https://upload.wikimedia.org/wikipedia/commons/8/8d/Rosa_acicularis.jpg" },
                pageprops: { "wikibase-shortdesc": "Name list" },
              },
            },
          },
        });
      }
      throw new Error(`unexpected url: ${url}`);
    });

    const result = await findArtistImage("Nasrin");

    expect(result).toBeNull();
  });

  it("rejects a page image from a formally-flagged MediaWiki disambiguation page", async () => {
    fetchWithRetryMock.mockImplementation(async (url: string) => {
      if (url.includes("he.wikipedia.org")) {
        return jsonResponse({ query: { pages: { "-1": {} } } });
      }
      if (url.includes("en.wikipedia.org")) {
        return jsonResponse({
          query: {
            pages: {
              "1": {
                original: { source: "https://upload.wikimedia.org/wikipedia/commons/x/xx/Unrelated.jpg" },
                pageprops: { disambiguation: "" },
              },
            },
          },
        });
      }
      throw new Error(`unexpected url: ${url}`);
    });

    const result = await findArtistImage("Some Ambiguous Name");

    expect(result).toBeNull();
  });

  it("returns null (never throws) when the underlying fetch fails", async () => {
    fetchWithRetryMock.mockImplementation(async () => {
      throw new Error("network down");
    });

    const result = await findArtistImage("Any Artist");

    expect(result).toBeNull();
  });
});
