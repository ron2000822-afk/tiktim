import { fetchWithRetry, RateLimiter } from "../lib/http";

// Wikimedia's own etiquette guidance asks for a low, steady request rate
// from scripted clients sharing one User-Agent — this lookup runs once per
// new artist, not per listing, so a conservative pace costs little.
const rateLimiter = new RateLimiter(1000);

export type ArtistImageResult = { imageUrl: string; imageCredit: string; imageLicense: string };

type WikiPageImageResponse = {
  query?: {
    pages?: Record<
      string,
      {
        original?: { source?: string };
        pageprops?: { disambiguation?: string; "wikibase-shortdesc"?: string };
      }
    >;
  };
};

// Confirmed live: the artist "Nasrin" matched a Wikipedia page titled
// "Nasrin" that isn't about her at all — it's a "Name list" page (a list
// of unrelated people/things sharing that name), and its page image was
// an unrelated flower photo. MediaWiki's formal disambiguation flag
// didn't catch this one (it's not tagged __DISAMBIG__), but Wikidata's
// short description did ("Name list") — checking both together catches
// real disambiguation pages and this kind of list page.
const NON_PERSON_SHORTDESC = /name list|given name|surname|disambiguation/i;

// Tried a Wikipedia-search-based fallback for names that don't exactly
// match a page title (e.g. "Hanan Yovel" has no Hebrew Wikipedia page
// under that exact Latin-script title). Reverted — verified live that
// the top search result is unreliable enough to actively cause harm:
// "Shai Zalman" matched "Shneur Zalman of Liadi" (an 18th-century rabbi),
// "Maor Cohen" matched a TV show page, "Tamir Greenberg" matched a
// different historical poet. A wrong photo confidently shown under a
// real artist's name is worse than no photo — exact-title matching only,
// same as the disambiguation lesson from "Nasrin".
async function getPageImage(wiki: "he" | "en", title: string): Promise<string | null> {
  const url = `https://${wiki}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|pageprops&piprop=original&titles=${encodeURIComponent(title)}&redirects=1`;
  const res = await fetchWithRetry(url, { rateLimiter });
  if (!res.ok) return null;
  const data = (await res.json()) as WikiPageImageResponse;
  const page = Object.values(data.query?.pages ?? {})[0];
  if (!page) return null;

  const shortdesc = page.pageprops?.["wikibase-shortdesc"];
  if (page.pageprops?.disambiguation !== undefined || (shortdesc && NON_PERSON_SHORTDESC.test(shortdesc))) {
    return null;
  }

  return page.original?.source ?? null;
}

type CommonsImageInfoResponse = {
  query?: {
    pages?: Record<
      string,
      {
        imageinfo?: [
          {
            extmetadata?: {
              Artist?: { value?: string };
              LicenseShortName?: { value?: string };
              Credit?: { value?: string };
            };
          },
        ];
      }
    >;
  };
};

const MAX_CREDIT_LENGTH = 60;

// Commons' `Artist` field is meant to hold a name, but plenty of uploads
// put a full attribution paragraph there instead (seen live: one file's
// "credit" was several sentences of usage instructions). Strip markup,
// collapse whitespace/newlines, and cap the length — this is rendered as
// a short badge on an event card, not a block of text.
function cleanCredit(value: string): string {
  const stripped = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return stripped.length > MAX_CREDIT_LENGTH ? `${stripped.slice(0, MAX_CREDIT_LENGTH - 1).trimEnd()}…` : stripped;
}

async function getImageAttribution(imageUrl: string): Promise<{ credit: string; license: string } | null> {
  // Wikipedia's page-image URL points at the file on Commons (or local
  // Wikipedia storage) — extract the filename and ask Commons directly for
  // the licensing metadata, since that's never included in the pageimages
  // response itself.
  const pathOnly = imageUrl.split("?")[0];
  // Confirmed live: "Miri Mesika"'s page image is a .webp file — the
  // original list (jpg/jpeg/png/svg/gif) silently dropped every webp
  // match, failing the whole lookup even though a perfectly good, found
  // image existed. Added tif/tiff too for the same reason — Commons
  // allows both, even if rare for this use case.
  const match = pathOnly.match(/\/([^/]+\.(?:jpg|jpeg|png|svg|gif|webp|tif|tiff))$/i);
  if (!match) return null;
  const fileTitle = `File:${decodeURIComponent(match[1])}`;

  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=${encodeURIComponent(fileTitle)}`;
  const res = await fetchWithRetry(url, { rateLimiter });
  if (!res.ok) return null;
  const data = (await res.json()) as CommonsImageInfoResponse;
  const page = Object.values(data.query?.pages ?? {})[0];
  const meta = page?.imageinfo?.[0]?.extmetadata;
  if (!meta) return null;

  const artist = meta.Artist?.value ? cleanCredit(meta.Artist.value) : null;
  const credit = meta.Credit?.value ? cleanCredit(meta.Credit.value) : null;
  const license = meta.LicenseShortName?.value ?? null;
  if (!license) return null; // No license metadata — don't use an image we can't attribute correctly.

  return { credit: artist ?? credit ?? "Wikimedia Commons", license };
}

/**
 * Looks up a free-licensed photo of a performer via Wikipedia's lead image
 * (sourced from Wikimedia Commons), with photographer credit + license —
 * per CLAUDE.md's "Artist images: Wikimedia Commons with license +
 * photographer credit" rule. Tries Hebrew Wikipedia first (most Israeli
 * performers), then English. Returns null (never throws) on any miss or
 * failure — callers treat that as "no image found", not an error; this is
 * a best-effort enrichment step, not a required part of ingestion.
 */
export async function findArtistImage(artistName: string): Promise<ArtistImageResult | null> {
  try {
    for (const wiki of ["he", "en"] as const) {
      const imageUrl = await getPageImage(wiki, artistName);
      if (!imageUrl) continue;

      const attribution = await getImageAttribution(imageUrl);
      if (!attribution) continue;

      return { imageUrl, imageCredit: attribution.credit, imageLicense: attribution.license };
    }
    return null;
  } catch {
    return null;
  }
}
