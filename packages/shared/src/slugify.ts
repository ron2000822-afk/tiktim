const NIQQUD_REGEX = /[֑-ׇ]/g;
const QUOTE_REGEX = /[׳״"'“”‘’]/g;
const LATIN_DIACRITICS_REGEX = /[̀-ͯ]/g;
const NON_SLUG_REGEX = /[^a-z0-9]+/g;
const EDGE_HYPHEN_REGEX = /^-+|-+$/g;

// Approximate consonantal transliteration, used only as a fallback when no
// Latin name is available. Prefer passing a curated name_en when you have
// one — this will never reproduce vowels (e.g. "שלמה" -> "shlmh", not
// "shlomo").
const HEBREW_TRANSLITERATION: Record<string, string> = {
  א: "",
  ב: "b",
  ג: "g",
  ד: "d",
  ה: "h",
  ו: "v",
  ז: "z",
  ח: "ch",
  ט: "t",
  י: "y",
  כ: "k",
  ך: "k",
  ל: "l",
  מ: "m",
  ם: "m",
  נ: "n",
  ן: "n",
  ס: "s",
  ע: "",
  פ: "p",
  ף: "f",
  צ: "tz",
  ץ: "tz",
  ק: "k",
  ר: "r",
  ש: "sh",
  ת: "t",
};

const HEBREW_LETTER_REGEX = /[א-ת]/g;

/**
 * Produces a URL-safe, transliterated Latin slug (e.g. "shlomo-artzi").
 * For Hebrew-only input this is an approximate consonantal transliteration —
 * callers that have a curated Latin name (artists.name_en, venues/cities
 * name_en) should slugify that instead for an accurate result.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(NIQQUD_REGEX, "")
    .replace(LATIN_DIACRITICS_REGEX, "")
    .replace(QUOTE_REGEX, "")
    .replace(HEBREW_LETTER_REGEX, (char) => HEBREW_TRANSLITERATION[char])
    .toLowerCase()
    .replace(NON_SLUG_REGEX, "-")
    .replace(EDGE_HYPHEN_REGEX, "");
}
