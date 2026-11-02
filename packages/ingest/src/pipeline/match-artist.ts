// See docs/INGESTION.md "Artist matching".

export type ArtistCandidateScore = { id: string; score: number };

export type ArtistMatchDecision =
  | { kind: "accepted"; artistId: string; confidence: number }
  | { kind: "ambiguous"; topCandidates: ArtistCandidateScore[] }
  | { kind: "none" };

const ACCEPT_THRESHOLD = 0.9;
const CANDIDATE_THRESHOLD = 0.75;
const GAP_THRESHOLD = 0.15;

/**
 * Pure decision logic over pre-scored candidates (exact match => 1.0,
 * otherwise trigram similarity from the DB). Kept separate from the DB
 * query so it's unit-testable without a live database.
 */
export function decideArtistMatch(candidates: ArtistCandidateScore[]): ArtistMatchDecision {
  if (candidates.length === 0) return { kind: "none" };

  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const secondBest = sorted[1];

  if (best.score >= ACCEPT_THRESHOLD) {
    return { kind: "accepted", artistId: best.id, confidence: best.score };
  }

  if (best.score >= CANDIDATE_THRESHOLD && (!secondBest || best.score - secondBest.score >= GAP_THRESHOLD)) {
    return { kind: "accepted", artistId: best.id, confidence: best.score };
  }

  if (best.score >= CANDIDATE_THRESHOLD) {
    return { kind: "ambiguous", topCandidates: sorted.slice(0, 5) };
  }

  return { kind: "none" };
}
