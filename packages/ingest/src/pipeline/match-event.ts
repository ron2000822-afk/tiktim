// See docs/INGESTION.md "Event matching (dedupe across sources)".
//
// The candidate query itself (same venue_id, starts_at within ±90 minutes,
// not cancelled) already handles the two "separate" examples from the doc:
// a different venue, or the same venue/artist more than 90 minutes apart,
// never become candidates in the first place. The scoring below exists to
// resolve what's left: candidates in that window that may or may not be the
// same show (e.g. a coincidental same-venue, close-time, different-artist
// booking should not merge).

export type EventCandidate = {
  id: string;
  headlinerArtistId: string;
  startsAt: Date;
};

export type EventMatchDecision =
  | { kind: "merge"; eventId: string; confidence: number }
  | { kind: "possible_duplicate"; eventId: string; confidence: number }
  | { kind: "separate" };

const MERGE_THRESHOLD = 0.85;
const DUPLICATE_QUEUE_THRESHOLD = 0.6;
const MAX_WINDOW_MINUTES = 90;

export function scoreEventCandidate(candidate: EventCandidate, listingHeadlinerArtistId: string, listingStartsAt: Date): number {
  const venueMatch = 1; // candidates are pre-filtered to the same venue_id
  const artistMatch = candidate.headlinerArtistId === listingHeadlinerArtistId ? 1 : 0;
  const minutesApart = Math.abs(candidate.startsAt.getTime() - listingStartsAt.getTime()) / 60_000;
  const timeProximity = Math.max(0, 1 - minutesApart / MAX_WINDOW_MINUTES);

  return 0.5 * venueMatch + 0.3 * artistMatch + 0.2 * timeProximity;
}

export function decideEventMatch(
  candidates: EventCandidate[],
  listingHeadlinerArtistId: string,
  listingStartsAt: Date,
): EventMatchDecision {
  if (candidates.length === 0) return { kind: "separate" };

  const scored = candidates
    .map((c) => ({ id: c.id, score: scoreEventCandidate(c, listingHeadlinerArtistId, listingStartsAt) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];

  if (best.score >= MERGE_THRESHOLD) {
    return { kind: "merge", eventId: best.id, confidence: best.score };
  }
  if (best.score >= DUPLICATE_QUEUE_THRESHOLD) {
    return { kind: "possible_duplicate", eventId: best.id, confidence: best.score };
  }
  return { kind: "separate" };
}
