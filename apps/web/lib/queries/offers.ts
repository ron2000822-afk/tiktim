import { and, asc, eq } from "drizzle-orm";
import { db } from "@tiktim/db";
import { sources, ticketOffers } from "@tiktim/db/schema";

export async function getOffersForEvent(eventId: string) {
  return db
    .select({
      id: ticketOffers.id,
      sourceNameHe: sources.nameHe,
      url: ticketOffers.url,
      affiliateUrl: ticketOffers.affiliateUrl,
      priceMin: ticketOffers.priceMin,
      priceMax: ticketOffers.priceMax,
      availability: ticketOffers.availability,
    })
    .from(ticketOffers)
    .innerJoin(sources, eq(sources.id, ticketOffers.sourceId))
    .where(and(eq(ticketOffers.eventId, eventId), eq(ticketOffers.isActive, true)))
    .orderBy(asc(ticketOffers.priceMin));
}
