import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("event page renders, offers link through /go, and passes a11y", async ({ page, request }) => {
  await page.goto("/");
  const firstEventLink = page.locator('a[href^="/event/"]').first();
  const href = await firstEventLink.getAttribute("href");
  expect(href).toBeTruthy();

  await page.goto(href!);
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);

  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious).toEqual([]);

  const buyLink = page.locator('a[href^="/go/"]').first();
  if (await buyLink.count()) {
    const goHref = await buyLink.getAttribute("href");
    const response = await request.get(goHref!, { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(response.headers()["location"]).toContain("example-sellers.test");
  }
});
