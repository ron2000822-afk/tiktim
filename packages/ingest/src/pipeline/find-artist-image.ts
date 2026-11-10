import { fetchWithRetry, RateLimiter } from "../lib/http";

// Wikimedia's own etiquette guidance asks for a low, steady request rate
// from scripted clients sharing one User-Agent — this lookup runs once per
// new artist, not per listing, so a conservative pace costs little.
const rateLimiter = new RateLimiter(1000);

export type ArtistImageResult = { imageUrl: string; imageCredit: string; imageLicense: string };

type WikiPageImageResponse = {
  query?: {
    pages?: Record<string, { original?: { source?: string } }>;
  };
};

async function getPageImage(wiki: "he" | "en", title: string): Promise<string | null> {
  const url = `https://${wiki}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original&titles=${encodeURIComponent(title)}&redirects=1`;
  const res = await fetchWithRetry(url, { rateLimiter });
  if (!res.ok) return null;
  const data = (await res.json()) as WikiPageImageResponse;
  const page = Object.values(data.query?.pages ?? {})[0];
  return page?.original?.source ?? null;
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
  const match = pathOnly.match(/\/([^/]+\.(?:jpg|jpeg|png|svg|gif))$/i);
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
