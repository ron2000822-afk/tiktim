import { describe, expect, it } from "vitest";
import { guessCityFromVenueName } from "./guess-city";

describe("guessCityFromVenueName", () => {
  it("finds a seeded city name embedded in the venue string", () => {
    expect(guessCityFromVenueName("היכל התרבות פתח תקווה")).toBe("פתח תקווה");
    expect(guessCityFromVenueName("אודיטוריום ספיר - כפר סבא")).toBe("כפר סבא");
  });

  it("prefers the longer city name when a shorter one would also match", () => {
    // "תל אביב-יפו" contains "תל אביב" as a substring — must not stop early.
    expect(guessCityFromVenueName("בית החייל - תל אביב")).toBe("תל אביב");
  });

  it("returns undefined for a venue in a town we haven't seeded", () => {
    expect(guessCityFromVenueName("כפר ויתקין")).toBeUndefined();
  });

  it("resolves common quoted Hebrew abbreviations not covered by a direct substring match", () => {
    expect(guessCityFromVenueName('ביתן 2 אקספו ת"א')).toBe("תל אביב");
    expect(guessCityFromVenueName('תיאטרון הבית גולדה פ"ת')).toBe("פתח תקווה");
  });

  it("resolves the same abbreviations when written with the gershayim punctuation mark instead of a plain quote", () => {
    expect(guessCityFromVenueName("תיאטרון האקספו ת״א")).toBe("תל אביב");
  });
});
