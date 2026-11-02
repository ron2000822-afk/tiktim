import { expect, test } from "@playwright/test";

test("unauthenticated visitor to /admin gets a real redirect, not a 200 with streamed content", async ({ request }) => {
  // Regression test: Cache Components can stream a 200 shell with the
  // redirect instruction embedded in the RSC payload instead of an actual
  // HTTP redirect, if anything (e.g. a root loading.tsx) wraps the admin
  // layout in an implicit Suspense boundary. That would let crawlers/non-JS
  // clients see dashboard chrome instead of being redirected.
  const response = await request.get("/admin", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers()["location"]).toContain("/admin/login");
});
