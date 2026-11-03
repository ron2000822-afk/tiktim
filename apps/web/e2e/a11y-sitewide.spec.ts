import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function assertNoSeriousViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious).toEqual([]);
}

test("artist page passes a11y", async ({ page, request }) => {
  // No page currently links to an artist page from normal browsing — pull
  // a real one from the sitemap instead of hardcoding a seeded name.
  const sitemapXml = await (await request.get("/sitemap.xml")).text();
  const match = sitemapXml.match(/<loc>[^<]*(\/artist\/[^<]+)<\/loc>/);
  expect(match).toBeTruthy();

  await page.goto(match![1]);
  await expect(page.locator("h1")).toBeVisible();
  await assertNoSeriousViolations(page);
});

test("venue page passes a11y", async ({ page }) => {
  await page.goto("/");
  const eventHref = await page.locator('a[href^="/event/"]').first().getAttribute("href");
  await page.goto(eventHref!);
  const venueHref = await page.locator('a[href^="/venue/"]').first().getAttribute("href");
  expect(venueHref).toBeTruthy();
  await page.goto(venueHref!);
  await expect(page.locator("h1")).toBeVisible();
  await assertNoSeriousViolations(page);
});

test("city page passes a11y", async ({ page }) => {
  await page.goto("/music/rock/tel-aviv-yafo");
  await expect(page.locator("h1")).toBeVisible();
  await assertNoSeriousViolations(page);
});

test("music hub and genre pages pass a11y", async ({ page }) => {
  await page.goto("/music");
  await assertNoSeriousViolations(page);

  await page.goto("/music/rock");
  await expect(page.locator("h1")).toBeVisible();
  await assertNoSeriousViolations(page);
});

for (const path of ["/about", "/terms", "/privacy", "/accessibility", "/advertise"]) {
  test(`legal page ${path} passes a11y`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await assertNoSeriousViolations(page);
  });
}

test("admin login page passes a11y", async ({ page }) => {
  await page.goto("/admin/login");
  await assertNoSeriousViolations(page);
});
