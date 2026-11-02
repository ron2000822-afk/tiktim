import { eq } from "drizzle-orm";
import { db } from "@tiktim/db";
import { ticketOffers } from "@tiktim/db/schema";

export async function getOfferForRedirect(offerId: string) {
  const [offer] = await db
    .select({
      id: ticketOffers.id,
      eventId: ticketOffers.eventId,
      sourceId: ticketOffers.sourceId,
      url: ticketOffers.url,
      affiliateUrl: ticketOffers.affiliateUrl,
    })
    .from(ticketOffers)
    .where(eq(ticketOffers.id, offerId))
    .limit(1);
  return offer ?? null;
}
