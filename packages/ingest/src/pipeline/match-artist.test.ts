import { describe, expect, it } from "vitest";
import { decideArtistMatch } from "./match-artist";

describe("decideArtistMatch", () => {
  it("accepts an exact match (score 1.0)", () => {
    const result = decideArtistMatch([{ id: "a1", score: 1.0 }]);
    expect(result).toEqual({ kind: "accepted", artistId: "a1", confidence: 1.0 });
  });

  it("accepts a high-confidence single candidate (>= 0.9)", () => {
    const result = decideArtistMatch([{ id: "a1", score: 0.92 }]);
    expect(result).toMatchObject({ kind: "accepted", artistId: "a1" });
  });

  it("accepts a >=0.75 candidate when the next-best is far enough behind", () => {
    const result = decideArtistMatch([
      { id: "a1", score: 0.8 },
      { id: "a2", score: 0.6 },
    ]);
    expect(result).toMatchObject({ kind: "accepted", artistId: "a1" });
  });

  it("flags ambiguous when two candidates are close and below the auto-accept bar", () => {
    const result = decideArtistMatch([
      { id: "a1", score: 0.8 },
      { id: "a2", score: 0.78 },
    ]);
    expect(result.kind).toBe("ambiguous");
  });

  it("returns none below the candidate threshold", () => {
    const result = decideArtistMatch([{ id: "a1", score: 0.6 }]);
    expect(result).toEqual({ kind: "none" });
  });

  it("returns none with no candidates at all", () => {
    expect(decideArtistMatch([])).toEqual({ kind: "none" });
  });
});
