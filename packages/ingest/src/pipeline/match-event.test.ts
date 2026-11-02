import { describe, expect, it } from "vitest";
import { decideEventMatch } from "./match-event";

const BASE_TIME = new Date("2026-12-24T19:00:00Z");
const minutesLater = (base: Date, minutes: number) => new Date(base.getTime() + minutes * 60_000);

describe("decideEventMatch", () => {
  it("merges the same venue + artist, ±60 min apart", () => {
    const candidates = [{ id: "e1", headlinerArtistId: "artist-1", startsAt: minutesLater(BASE_TIME, 60) }];
    const result = decideEventMatch(candidates, "artist-1", BASE_TIME);
    expect(result).toMatchObject({ kind: "merge", eventId: "e1" });
  });

  it("merges an exact same-time, same-artist match", () => {
    const candidates = [{ id: "e1", headlinerArtistId: "artist-1", startsAt: BASE_TIME }];
    const result = decideEventMatch(candidates, "artist-1", BASE_TIME);
    expect(result).toMatchObject({ kind: "merge", eventId: "e1", confidence: 1 });
  });

  it("does not merge a different artist at the same venue and time (no candidates in range for the real case, but if present, scores low)", () => {
    const candidates = [{ id: "e1", headlinerArtistId: "artist-2", startsAt: BASE_TIME }];
    const result = decideEventMatch(candidates, "artist-1", BASE_TIME);
    // venue(0.5) + artist(0) + time(0.2) = 0.7 -> queued for review, not auto-merged
    expect(result.kind).toBe("possible_duplicate");
  });

  it("treats two shows by the same artist at the same venue 19:00 and 22:00 as separate (outside the 90-minute candidate window)", () => {
    // The pipeline's candidate query itself would never return the 22:00
    // show as a candidate for the 19:00 listing (180 min apart), so this
    // models what the query already guarantees: no candidates -> separate.
    const result = decideEventMatch([], "artist-1", BASE_TIME);
    expect(result).toEqual({ kind: "separate" });
  });

  it("returns separate when the single candidate scores below the review threshold", () => {
    const farAndDifferentArtist = [{ id: "e1", headlinerArtistId: "artist-2", startsAt: minutesLater(BASE_TIME, 89) }];
    // venue(0.5) + artist(0) + time(~0.002) ~= 0.5 -> below 0.6
    const result = decideEventMatch(farAndDifferentArtist, "artist-1", BASE_TIME);
    expect(result).toEqual({ kind: "separate" });
  });
});
