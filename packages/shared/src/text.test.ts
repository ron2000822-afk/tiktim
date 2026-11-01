import { describe, expect, it } from "vitest";
import { normalizeHe } from "./text";

describe("normalizeHe", () => {
  it("strips niqqud", () => {
    expect(normalizeHe("שָׁלוֹם")).toBe(normalizeHe("שלום"));
    // final-letter folding also applies to the matching key (ם -> מ)
    expect(normalizeHe("שָׁלוֹם")).toBe("שלומ");
  });

  it("strips gershayim and geresh so punctuation doesn't affect matching", () => {
    expect(normalizeHe('ת"א')).toBe(normalizeHe("תא"));
    expect(normalizeHe("ת״א")).toBe(normalizeHe("תא"));
    expect(normalizeHe('ר"ת')).toBe("רת");
  });

  it("handles mixed Hebrew/English, lowercasing only Latin letters", () => {
    expect(normalizeHe("שלמה ארצי - Shlomo Artzi")).toBe("שלמה ארצי shlomo artzi");
  });

  it("recognizes common real-world spelling variants as equal", () => {
    expect(normalizeHe("שלמה ארצי")).toBe(normalizeHe("שלמה ארצי"));
    expect(normalizeHe("Shlomo Artzi")).toBe(normalizeHe("shlomo artzi"));
  });

  it("folds final letters for matching", () => {
    expect(normalizeHe("מלך")).toBe("מלכ");
    expect(normalizeHe("מלך")).not.toBe("מלך");
  });

  it("replaces separators with spaces and collapses whitespace", () => {
    expect(normalizeHe("היכל התרבות | תל אביב")).toBe("היכל התרבות תל אביב");
    expect(normalizeHe("א   ב")).toBe("א ב");
  });

  it("trims and is idempotent", () => {
    const once = normalizeHe("  שלום עולם  ");
    expect(once).toBe("שלומ עולמ");
    expect(normalizeHe(once)).toBe(once);
  });
});
