import "./load-env";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@tiktim/db";
import { events, sources, ticketOffers } from "@tiktim/db/schema";
import { ticketmasterConnector } from "./connectors/ticketmaster";
import type { NormalizedListing } from "./connectors/types";

// One-time (re-runnable) backfill for Ticketmaster offers ingested before
// enrichPrice() was wired in — processListing() only enriches a price when
// it first sees an offer, so offers already in the DB with no price need
// this to catch up. Safe to re-run: only touches ticket_offers with no
// price yet.
async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const [tmSource] = await db.select().from(sources).where(eq(sources.slug, "ticketmaster")).limit(1);
  if (!tmSource) {
    console.log("No ticketmaster source row — nothing to backfill.");
    return;
  }

  const candidates = await db
    .select({ id: ticketOffers.id, eventId: ticketOffers.eventId, url: ticketOffers.url })
    .from(ticketOffers)
    .where(and(eq(ticketOffers.sourceId, tmSource.id), eq(ticketOffers.isActive, true), isNull(ticketOffers.priceMin)));

  console.log(`${candidates.length} ticketmaster offer(s) with no price. ${dryRun ? "(dry run — not writing)" : ""}`);

  let enriched = 0;
  const touchedEventIds = new Set<string>();

  for (const offer of candidates) {
    const minimalListing = { url: offer.url } as NormalizedListing;
    const result = await ticketmasterConnector.enrichPrice?.(minimalListing);
    if (!result) continue;

    enriched++;
    console.log(`  [found] ${offer.url} -> ${result.priceMin}-${result.priceMax} ${result.currency ?? ""}`);
    if (!dryRun) {
      await db
        .update(ticketOffers)
        .set({ priceMin: String(result.priceMin), priceMax: String(result.priceMax) })
        .where(eq(ticketOffers.id, offer.id));
      touchedEventIds.add(offer.eventId);
    }
  }

  if (!dryRun) {
    for (const eventId of touchedEventIds) {
      const [priceAgg] = await db
        .select({ min: sql<string | null>`min(price_min)`, max: sql<string | null>`max(price_max)` })
        .from(ticketOffers)
        .where(and(eq(ticketOffers.eventId, eventId), eq(ticketOffers.isActive, true)));
      await db
        .update(events)
        .set({ minPrice: priceAgg?.min ?? null, maxPrice: priceAgg?.max ?? null })
        .where(eq(events.id, eventId));
    }
  }

  console.log(`Found a price for ${enriched} of ${candidates.length} offer(s), rolled up to ${touchedEventIds.size} event(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));
