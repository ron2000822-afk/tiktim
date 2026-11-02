// Seller titles mix artist, tour, and venue, e.g.:
//   "שלמה ארצי - מופע אקוסטי | היכל התרבות"
//   "עומר אדם בהופעה"
//   "ערב סטנדאפ: שחר חסון, אדיר מילר ועוד"
//   "TOOL – Live in Israel"
// See docs/INGESTION.md "Title parsing" for the exact rules this implements.

export type ParsedTitle = {
  artistNames: string[];
  tourName?: string;
};

const SEPARATOR_REGEX = / - | – |\||:/;

// Phrases dropped as pure noise. "סטנדאפ" is intentionally excluded here —
// it's only dropped when it's the *entire* remaining segment, handled
// separately in isAllFiller/stripEdgeFiller.
const GENERIC_PHRASES = ["בהופעה", "במופע", "הופעה", "מופע", "לייב", "live", "in israel"];

// "עוד" shows up alone after the vav-prefix splitter consumes "ו" from
// "ועוד" as a separator (same rule that splits "X ואדיר" into "X"/"אדיר").
const LINEUP_STOPWORDS = new Set(["ועוד", "עוד", "and more"]);

function buildFillerRegex(phrases: string[]): RegExp {
  const escaped = phrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(${escaped.join("|")})\\b`, "giu");
}

const FILLER_REGEX = buildFillerRegex(GENERIC_PHRASES);
const FILLER_WITH_STANDUP_REGEX = buildFillerRegex([...GENERIC_PHRASES, "סטנדאפ"]);

function stripVenue(title: string, venueName?: string): string {
  if (!venueName) return title;
  const trimmedVenue = venueName.trim();
  if (!trimmedVenue) return title;
  const index = title.toLowerCase().indexOf(trimmedVenue.toLowerCase());
  if (index === -1) return title;
  return title.slice(0, index) + title.slice(index + trimmedVenue.length);
}

function splitSegments(title: string): string[] {
  return title
    .split(SEPARATOR_REGEX)
    .map((s) => s.trim().replace(/^[-–|:]+|[-–|:]+$/g, "").trim())
    .filter(Boolean);
}

/** True when a segment, once generic filler phrases are removed, has nothing real left. */
function isAllFiller(segment: string): boolean {
  const stripped = segment.replace(FILLER_WITH_STANDUP_REGEX, "").trim();
  return stripped.length === 0;
}

/** Strips a generic phrase glued to the start/end of a single-segment title (no explicit separator). */
function stripEdgeFiller(segment: string): string {
  let result = segment.trim();
  let changed = true;
  while (changed) {
    changed = false;
    const withoutEdges = result.replace(/^\s*(בהופעה|במופע|הופעה|מופע|לייב)\s+/giu, "").replace(/\s+(בהופעה|במופע|הופעה|מופע|לייב)\s*$/giu, "");
    if (withoutEdges !== result) {
      result = withoutEdges.trim();
      changed = true;
    }
  }
  return result;
}

function splitLineup(segment: string): string[] {
  return segment
    .split(/,| ו(?=[א-ת])|&/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !LINEUP_STOPWORDS.has(s.toLowerCase()));
}

export function parseTitle(rawTitle: string, venueName?: string): ParsedTitle {
  const afterVenue = stripVenue(rawTitle, venueName).trim();
  const segments = splitSegments(afterVenue);

  if (segments.length <= 1) {
    const single = segments[0] ?? afterVenue;
    const cleaned = stripEdgeFiller(single);
    return { artistNames: splitLineup(cleaned) };
  }

  const lineupIndex = segments.findIndex((s) => s.includes(","));
  const artistIndex = lineupIndex === -1 ? 0 : lineupIndex;
  const artistSegment = segments[artistIndex];
  const otherSegments = segments.filter((_, i) => i !== artistIndex);

  const tourNameCandidate = otherSegments.join(" ").trim();
  const tourName = tourNameCandidate && !isAllFiller(tourNameCandidate) ? tourNameCandidate : undefined;

  return { artistNames: splitLineup(artistSegment), tourName };
}

// Exported for reuse by connectors that need to strip stray filler without a
// full title-parse (e.g. cleaning an already-separated artist field).
export function stripFiller(text: string): string {
  return text.replace(FILLER_REGEX, "").replace(/\s+/g, " ").trim();
}
