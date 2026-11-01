const NIQQUD_REGEX = /[֑-ׇ]/g;
const QUOTE_REGEX = /[׳״"'“”‘’]/g;
const SEPARATOR_REGEX = /[-–—|/]/g;
const NON_WORD_REGEX = /[^\p{L}\p{N}\s]/gu;
const WHITESPACE_REGEX = /\s+/g;

const FINAL_LETTERS: Record<string, string> = {
  "ך": "כ", // ך -> כ
  "ם": "מ", // ם -> מ
  "ן": "נ", // ן -> נ
  "ף": "פ", // ף -> פ
  "ץ": "צ", // ץ -> צ
};

const FINAL_LETTERS_REGEX = /[ךםןףץ]/g;

/**
 * Normalizes Hebrew (and mixed Hebrew/English) text into a stable key used
 * for fuzzy matching artists, venues and cities across sources. See
 * docs/INGESTION.md "Hebrew normalization" for the exact rules.
 */
export function normalizeHe(input: string): string {
  return input
    .normalize("NFKC")
    .replace(NIQQUD_REGEX, "")
    .replace(QUOTE_REGEX, "")
    .replace(SEPARATOR_REGEX, " ")
    .replace(NON_WORD_REGEX, "")
    .toLowerCase()
    .replace(FINAL_LETTERS_REGEX, (char) => FINAL_LETTERS[char])
    .replace(WHITESPACE_REGEX, " ")
    .trim();
}
