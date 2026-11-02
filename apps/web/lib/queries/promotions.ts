import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@tiktim/db";
import { artists, categories, cities, eventArtists, events, genres, promotions, venues } from "@tiktim/db/schema";
import { eventCardSelection, primaryArtistGenres, primaryGenre, type EventCardData } from "./events";

function activeConditions(slot: "hero" | "genre_rail_top") {
  const now = new Date();
  return and(eq(promotions.slot, slot), eq(promotions.isActive, true), lte(promotions.startsAt, now), gte(promotions.endsAt, now));
}

const promotedEventSelection = { ...eventCardSelection, promotionGenreSlug: genres.slug };

function promotedEventQuery() {
  return db
    .select(promotedEventSelection)
    .from(promotions)
    .innerJoin(events, eq(events.id, promotions.eventId))
    .innerJoin(venues, eq(events.venueId, venues.id))
    .innerJoin(cities, eq(venues.cityId, cities.id))
    .innerJoin(categories, eq(events.categoryId, categories.id))
    .innerJoin(eventArtists, and(eq(eventArtists.eventId, events.id), eq(eventArtists.role, "headliner")))
    .innerJoin(artists, eq(artists.id, eventArtists.artistId))
    .leftJoin(primaryArtistGenres, and(eq(primaryArtistGenres.artistId, artists.id), eq(primaryArtistGenres.isPrimary, true)))
    .leftJoin(primaryGenre, eq(primaryGenre.id, primaryArtistGenres.genreId))
    .leftJoin(genres, eq(genres.id, promotions.genreId));
}

export async function getActiveHeroPromotion(): Promise<EventCardData | null> {
  const [row] = await promotedEventQuery().where(activeConditions("hero")).limit(1);
  return row ?? null;
}

/** All active genre_rail_top promotions at once, keyed by genre slug — avoids one query per genre on the home page. */
export async function getActiveGenreRailPromotions(): Promise<Map<string, EventCardData>> {
  const rows = await promotedEventQuery().where(activeConditions("genre_rail_top"));
  const map = new Map<string, EventCardData>();
  for (const { promotionGenreSlug, ...event } of rows) {
    if (promotionGenreSlug) map.set(promotionGenreSlug, event);
  }
  return map;
}
