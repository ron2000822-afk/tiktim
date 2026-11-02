"use server";

import { db } from "@tiktim/db";
import { errorReports } from "@tiktim/db/schema";

const VALID_KINDS = ["wrong_date", "wrong_price", "cancelled", "wrong_venue", "other"] as const;

export async function submitErrorReport(formData: FormData) {
  const eventId = String(formData.get("eventId"));
  const kindRaw = String(formData.get("kind"));
  const message = String(formData.get("message") ?? "").trim();
  const kind = (VALID_KINDS as readonly string[]).includes(kindRaw)
    ? (kindRaw as (typeof VALID_KINDS)[number])
    : "other";

  await db.insert(errorReports).values({
    eventId,
    kind,
    message: message || null,
  });

  return { ok: true };
}
