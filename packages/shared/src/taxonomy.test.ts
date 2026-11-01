import { describe, expect, it } from "vitest";
import { activeCategories, allGenres, regions, taxonomy } from "./taxonomy";

describe("taxonomy", () => {
  it("loads docs/taxonomy.json and validates it", () => {
    expect(taxonomy.categories.length).toBeGreaterThan(0);
  });

  it("exposes only active categories separately", () => {
    expect(activeCategories.every((c) => c.is_active)).toBe(true);
    expect(activeCategories.map((c) => c.slug)).toEqual(
      expect.arrayContaining(["music", "standup"]),
    );
  });

  it("flattens genres with their category slug", () => {
    const rock = allGenres.find((g) => g.slug === "rock");
    expect(rock).toMatchObject({ slug: "rock", categorySlug: "music" });
  });

  it("loads regions", () => {
    expect(regions.map((r) => r.slug)).toContain("tel-aviv");
  });
});
