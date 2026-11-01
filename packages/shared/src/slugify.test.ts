import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("slugify", () => {
  it("slugifies plain Latin names exactly", () => {
    expect(slugify("Shlomo Artzi")).toBe("shlomo-artzi");
    expect(slugify("Hangar 11")).toBe("hangar-11");
  });

  it("strips niqqud before transliterating", () => {
    expect(slugify("שָׁלוֹם")).toBe(slugify("שלום"));
  });

  it("strips gershayim/geresh instead of leaving stray punctuation", () => {
    const slug = slugify('תיאטרון ר"ת');
    expect(slug).toMatch(SLUG_FORMAT);
    expect(slug).not.toContain('"');
    expect(slug).not.toContain("'");
  });

  it("produces a valid slug for mixed Hebrew/English input", () => {
    const slug = slugify("שלמה ארצי - Acoustic Show");
    expect(slug).toMatch(SLUG_FORMAT);
    expect(slug).toContain("acoustic-show");
  });

  it("collapses repeated separators and trims leading/trailing hyphens", () => {
    expect(slugify("  Hello   World!! ")).toBe("hello-world");
  });

  it("never produces empty output for non-empty input with letters", () => {
    expect(slugify("היכל התרבות")).not.toBe("");
  });
});
