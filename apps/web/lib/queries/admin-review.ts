import { desc, eq } from "drizzle-orm";
import { db } from "@tiktim/db";
import { errorReports, events, reviewQueue } from "@tiktim/db/schema";

export async function listOpenReviewQueue() {
  return db.select().from(reviewQueue).where(eq(reviewQueue.status, "open")).orderBy(desc(reviewQueue.createdAt)).limit(200);
}

export async function listOpenErrorReports() {
  return db
    .select({
      id: errorReports.id,
      eventId: errorReports.eventId,
      eventTitle: events.title,
      kind: errorReports.kind,
      message: errorReports.message,
      contactEmail: errorReports.contactEmail,
      createdAt: errorReports.createdAt,
    })
    .from(errorReports)
    .innerJoin(events, eq(events.id, errorReports.eventId))
    .where(eq(errorReports.status, "open"))
    .orderBy(desc(errorReports.createdAt))
    .limit(200);
}
