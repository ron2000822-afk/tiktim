import { CITIES } from "@tiktim/db/seed-data";

// Merged municipalities ("תל אביב-יפו", "מודיעין-מכבים-רעות") are almost
// always called by just their first segment colloquially — a venue saying
// plain "תל אביב" should still resolve, not just the full official name.
const CITY_NAME_CANDIDATES = Array.from(
  new Set(CITIES.flatMap((c) => (c.nameHe.includes("-") ? [c.nameHe, c.nameHe.split("-")[0]] : [c.nameHe]))),
).sort((a, b) => b.length - a.length);

// Common quoted Hebrew abbreviations seen in venue names across multiple
// sellers (e.g. "ביתן 2 אקספו ת\"א", "תיאטרון הבית גולדה פ\"ת") that don't
// substring-match any seeded city name directly.
const ABBREVIATION_TO_CITY: Record<string, string> = {
  'ת"א': "תל אביב",
  'פ"ת': "פתח תקווה",
  'ר"ג': "רמת גן",
  'כ"ס': "כפר סבא",
  'ב"ש': "באר שבע",
};

// Sellers inconsistently use a plain double-quote (") or the Hebrew
// gershayim punctuation mark (״, U+05F4) in abbreviations like ת"א / ת״א —
// normalize both to the same character before matching.
function normalizeQuotes(text: string): string {
  return text.replace(/״/g, '"');
}

/** Best-effort substring match of a venue name against our seeded city list — venues in towns we haven't seeded, or with no recognizable city text, fall back to review via validateListing's missing-city rejection. */
export function guessCityFromVenueName(venueName: string): string | undefined {
  const normalized = normalizeQuotes(venueName);

  const direct = CITY_NAME_CANDIDATES.find((cityName) => normalized.includes(cityName));
  if (direct) return direct;

  for (const [abbreviation, cityName] of Object.entries(ABBREVIATION_TO_CITY)) {
    if (normalized.includes(abbreviation)) return cityName;
  }
  return undefined;
}
