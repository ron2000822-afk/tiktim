import { desc, eq } from "drizzle-orm";
import { db } from "@tiktim/db";
import { events, genres, promotions } from "@tiktim/db/schema";

export async function listPromotions() {
  return db
    .select({
      id: promotions.id,
      slot: promotions.slot,
      startsAt: promotions.startsAt,
      endsAt: promotions.endsAt,
      advertiser: promotions.advertiser,
      price: promotions.price,
      isActive: promotions.isActive,
      eventTitle: events.title,
      genreNameHe: genres.nameHe,
    })
    .from(promotions)
    .innerJoin(events, eq(events.id, promotions.eventId))
    .leftJoin(genres, eq(genres.id, promotions.genreId))
    .orderBy(desc(promotions.startsAt));
}
