import { describe, expect, it } from "vitest";
import { parseTitle } from "./parse-title";

describe("parseTitle", () => {
  it("strips the venue and keeps a real tour name as-is", () => {
    const result = parseTitle("שלמה ארצי - מופע אקוסטי | היכל התרבות", "היכל התרבות");
    expect(result.artistNames).toEqual(["שלמה ארצי"]);
    expect(result.tourName).toBe("מופע אקוסטי");
  });

  it("drops a generic word glued to the artist with no separator", () => {
    const result = parseTitle("עומר אדם בהופעה");
    expect(result.artistNames).toEqual(["עומר אדם"]);
    expect(result.tourName).toBeUndefined();
  });

  it("splits a comma-separated lineup after a colon, dropping ועוד", () => {
    const result = parseTitle("ערב סטנדאפ: שחר חסון, אדיר מילר ועוד");
    expect(result.artistNames).toEqual(["שחר חסון", "אדיר מילר"]);
    expect(result.tourName).toBe("ערב סטנדאפ");
  });

  it("drops a tour segment that is pure filler", () => {
    const result = parseTitle("TOOL – Live in Israel");
    expect(result.artistNames).toEqual(["TOOL"]);
    expect(result.tourName).toBeUndefined();
  });

  it("splits a lineup joined with the Hebrew vav-prefix 'and'", () => {
    const result = parseTitle("שחר חסון ואדיר מילר");
    expect(result.artistNames).toEqual(["שחר חסון", "אדיר מילר"]);
  });

  it("handles a title with no separators and no filler as a single artist", () => {
    const result = parseTitle("עדן בן זקן");
    expect(result.artistNames).toEqual(["עדן בן זקן"]);
    expect(result.tourName).toBeUndefined();
  });

  it("keeps 'סטנדאפ' when it's not the only word in the tour segment", () => {
    const result = parseTitle("נועה קירל - ערב סטנדאפ מיוחד");
    expect(result.tourName).toBe("ערב סטנדאפ מיוחד");
  });
});
