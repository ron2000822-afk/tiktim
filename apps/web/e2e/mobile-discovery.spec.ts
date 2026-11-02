import { expect, test, devices } from "@playwright/test";

test.use({ viewport: devices["iPhone 13"].viewport });

test("finds rock shows this weekend in Tel Aviv from the home page in 3 interactions", async ({ page }) => {
  await page.goto("/");

  // Interaction 1: open the "רוק" genre rail.
  await page.locator('a[href="/music/rock"]', { hasText: "הכל" }).first().click();
  await expect(page).toHaveURL("/music/rock");

  // Interaction 2: narrow to Tel Aviv.
  await page.getByRole("link", { name: "בתל אביב-יפו" }).click();
  await expect(page).toHaveURL("/music/rock/tel-aviv-yafo");

  // Interaction 3: narrow to this weekend.
  await page.getByRole("link", { name: 'רק בסופ"ש' }).click();
  await expect(page).toHaveURL(/\/search\?genre=rock&city=tel-aviv-yafo&weekday=4,5,6/);

  await expect(page.getByRole("heading", { level: 1, name: "חיפוש" })).toBeVisible();
});
