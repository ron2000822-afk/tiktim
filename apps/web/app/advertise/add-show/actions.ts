"use server";

import { db } from "@tiktim/db";
import { reviewQueue } from "@tiktim/db/schema";

export async function submitShow(formData: FormData) {
  const artistName = String(formData.get("artistName") ?? "").trim();
  const venueName = String(formData.get("venueName") ?? "").trim();
  const cityName = String(formData.get("cityName") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "").trim();
  const categoryHint = String(formData.get("categoryHint") ?? "music");
  const url = String(formData.get("url") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!artistName || !venueName || !cityName || !startsAt || !contactEmail) {
    return { ok: false, error: "חסרים שדות חובה" };
  }

  // Deliberately does NOT touch events/artists/venues — producer
  // submissions are reviewed and converted into a real event by an admin,
  // never auto-published. See docs/BUILD_PLAN.md Phase 3 and
  // docs/DATA_MODEL.md's review_kind "submission".
  await db.insert(reviewQueue).values({
    kind: "submission",
    payload: { artistName, venueName, cityName, startsAt, categoryHint, url: url || null, contactName, contactEmail, notes },
    createdBy: "user",
  });

  return { ok: true };
}
