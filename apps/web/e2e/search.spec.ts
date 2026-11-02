import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("search page passes a11y and has no serious violations", async ({ page }) => {
  await page.goto("/search");
  await expect(page.locator("h1")).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious).toEqual([]);
});

test("searching a surname-only query and the full name return the same artist", async ({ request }) => {
  // Pick a known seeded artist via autocomplete, then verify both the full
  // name and the surname alone resolve to it — matching the PRD's
  // acceptance criterion that partial/aliased queries converge on one
  // artist ("ארצי" / "artzi" / "שלמה ארצי" all return the same result).
  const fullNameResponse = await request.get("/api/autocomplete?q=%D7%90%D7%95%D7%A8%20%D7%90%D7%A9%D7%9B%D7%A0%D7%96%D7%99");
  const fullNameData = await fullNameResponse.json();
  expect(fullNameData.suggestions.length).toBeGreaterThan(0);

  const surnameResponse = await request.get("/api/autocomplete?q=%D7%90%D7%A9%D7%9B%D7%A0%D7%96%D7%99");
  const surnameData = await surnameResponse.json();
  const hrefs = surnameData.suggestions.map((s: { href: string }) => s.href);
  expect(hrefs).toContain(fullNameData.suggestions[0].href);
});
