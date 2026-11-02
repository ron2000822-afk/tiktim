import { alias } from "drizzle-orm/pg-core";
import { and, asc, desc, eq, exists, gte, inArray, isNotNull, lte, ne, sql } from "drizzle-orm";
import { db } from "@tiktim/db";
import { artistGenres, artists, categories, cities, eventArtists, events, genres, venues } from "@tiktim/db/schema";

const primaryArtistGenres = alias(artistGenres, "primary_artist_genres");
const primaryGenre = alias(genres, "primary_genre");

export type EventCardData = {
  id: string;
  slug: string;
  shortId: string;
  title: string;
  startsAt: Date;
  status: "scheduled" | "few_left" | "sold_out" | "postponed" | "cancelled" | "unavailable" | "past";
  minPrice: string | null;
  maxPrice: string | null;
  imageUrl: string | null;
  tags: string[];
  isFeatured: boolean;
  venueName: string;
  venueSlug: string;
  citySlug: string;
  cityNameHe: string;
  artistNameHe: string;
  artistSlug: string;
  categorySlug: string;
  genreSlug: string | null;
  firstSeenAt: Date;
};

const eventCardSelection = {
  id: events.id,
  slug: events.slug,
  shortId: events.shortId,
  title: events.title,
  startsAt: events.startsAt,
  status: events.status,
  minPrice: events.minPrice,
  maxPrice: events.maxPrice,
  imageUrl: events.imageUrl,
  tags: events.tags,
  isFeatured: events.isFeatured,
  firstSeenAt: events.firstSeenAt,
  venueName: venues.name,
  venueSlug: venues.slug,
  citySlug: cities.slug,
  cityNameHe: cities.nameHe,
  artistNameHe: artists.nameHe,
  artistSlug: artists.slug,
  categorySlug: categories.slug,
  genreSlug: primaryGenre.slug,
};

export type EventFilters = {
  categorySlug?: string;
  genreSlugs?: string[];
  citySlug?: string;
  regionSlug?: string;
  dateStart?: Date;
  dateEnd?: Date;
  searchQuery?: string;
  priceMax?: number;
  weekdays?: number[];
  venueTypes?: string[];
  outdoorOnly?: boolean;
  freeOnly?: boolean;
  availableOnly?: boolean;
  featuredOnly?: boolean;
  artistSlug?: string;
  venueSlug?: string;
  excludeEventId?: string;
  sort?: "date" | "popularity" | "price";
  limit?: number;
  offset?: number;
};

export async function listEvents(filters: EventFilters = {}): Promise<EventCardData[]> {
  const conditions = [gte(events.startsAt, filters.dateStart ?? new Date()), isNotNull(events.publishedAt)];

  if (filters.dateEnd) conditions.push(lte(events.startsAt, filters.dateEnd));
  if (filters.categorySlug) conditions.push(eq(categories.slug, filters.categorySlug));
  if (filters.citySlug) conditions.push(eq(cities.slug, filters.citySlug));
  if (filters.artistSlug) conditions.push(eq(artists.slug, filters.artistSlug));
  if (filters.venueSlug) conditions.push(eq(venues.slug, filters.venueSlug));
  if (filters.excludeEventId) conditions.push(ne(events.id, filters.excludeEventId));
  if (filters.featuredOnly) conditions.push(eq(events.isFeatured, true));
  if (filters.outdoorOnly) conditions.push(eq(venues.isOutdoor, true));
  if (filters.venueTypes?.length) conditions.push(inArray(venues.venueType, filters.venueTypes as (typeof venues.venueType.enumValues)[number][]));
  if (filters.priceMax !== undefined) conditions.push(lte(events.minPrice, String(filters.priceMax)));
  if (filters.availableOnly) conditions.push(ne(events.status, "sold_out"));
  if (filters.freeOnly) conditions.push(sql`'free' = ANY(${events.tags})`);
  if (filters.weekdays?.length) {
    conditions.push(
      sql`extract(dow from ${events.startsAt} at time zone 'Asia/Jerusalem') in (${sql.join(
        filters.weekdays.map((d) => sql`${d}`),
        sql`, `,
      )})`,
    );
  }
  if (filters.searchQuery) {
    const likeQuery = `%${filters.searchQuery}%`;
    conditions.push(
      sql`(
        ${artists.nameNorm} ilike ${likeQuery} or ${artists.nameNorm} % ${filters.searchQuery}
        or exists (select 1 from unnest(${artists.aliasesNorm}) alias where alias ilike ${likeQuery} or alias % ${filters.searchQuery})
        or ${venues.nameNorm} ilike ${likeQuery} or ${venues.nameNorm} % ${filters.searchQuery}
        or ${events.title} ilike ${likeQuery}
      )`,
    );
  }
  if (filters.genreSlugs?.length) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(artistGenres)
          .innerJoin(genres, eq(genres.id, artistGenres.genreId))
          .where(and(eq(artistGenres.artistId, artists.id), inArray(genres.slug, filters.genreSlugs))),
      ),
    );
  }

  const orderBy =
    filters.sort === "popularity"
      ? [desc(events.hotScore), asc(events.startsAt)]
      : filters.sort === "price"
        ? [asc(events.minPrice), asc(events.startsAt)]
        : [asc(events.startsAt)];

  return db
    .select(eventCardSelection)
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .innerJoin(cities, eq(venues.cityId, cities.id))
    .innerJoin(categories, eq(events.categoryId, categories.id))
    .innerJoin(eventArtists, and(eq(eventArtists.eventId, events.id), eq(eventArtists.role, "headliner")))
    .innerJoin(artists, eq(artists.id, eventArtists.artistId))
    .leftJoin(primaryArtistGenres, and(eq(primaryArtistGenres.artistId, artists.id), eq(primaryArtistGenres.isPrimary, true)))
    .leftJoin(primaryGenre, eq(primaryGenre.id, primaryArtistGenres.genreId))
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(filters.limit ?? 24)
    .offset(filters.offset ?? 0);
}

export async function listPastEventsByArtist(artistSlug: string, limit = 12): Promise<EventCardData[]> {
  return db
    .select(eventCardSelection)
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .innerJoin(cities, eq(venues.cityId, cities.id))
    .innerJoin(categories, eq(events.categoryId, categories.id))
    .innerJoin(eventArtists, and(eq(eventArtists.eventId, events.id), eq(eventArtists.role, "headliner")))
    .innerJoin(artists, eq(artists.id, eventArtists.artistId))
    .leftJoin(primaryArtistGenres, and(eq(primaryArtistGenres.artistId, artists.id), eq(primaryArtistGenres.isPrimary, true)))
    .leftJoin(primaryGenre, eq(primaryGenre.id, primaryArtistGenres.genreId))
    .where(and(eq(artists.slug, artistSlug), lte(events.startsAt, new Date()), isNotNull(events.publishedAt)))
    .orderBy(desc(events.startsAt))
    .limit(limit);
}

/** All published events (including past ones — they stay indexed, just with a "past" status). */
export async function listAllPublishedEventRefs(): Promise<{ slug: string; shortId: string; updatedAt: Date }[]> {
  return db
    .select({ slug: events.slug, shortId: events.shortId, updatedAt: events.updatedAt })
    .from(events)
    .where(isNotNull(events.publishedAt));
}

/**
 * Genre slugs with >=3 upcoming events — the same threshold that gates
 * indexing on /music/[genre]. Matches listEvents's genreSlugs filter
 * semantics exactly (any genre assignment on the headliner, not just
 * their primary one) so the sitemap and the page's own noindex check
 * never disagree.
 */
export async function listIndexableGenreSlugs(): Promise<string[]> {
  const rows = await db
    .select({ genreSlug: genres.slug, count: sql<number>`count(distinct ${events.id})` })
    .from(events)
    .innerJoin(eventArtists, and(eq(eventArtists.eventId, events.id), eq(eventArtists.role, "headliner")))
    .innerJoin(artistGenres, eq(artistGenres.artistId, eventArtists.artistId))
    .innerJoin(genres, eq(genres.id, artistGenres.genreId))
    .where(and(isNotNull(events.publishedAt), gte(events.startsAt, new Date())))
    .groupBy(genres.slug)
    .having(sql`count(distinct ${events.id}) >= 3`);

  return rows.map((r) => r.genreSlug);
}

/** genre/city pairs with >=3 upcoming events — the same threshold that gates indexing on the page itself. */
export async function listIndexableGenreCityCombos(): Promise<{ genreSlug: string; citySlug: string }[]> {
  const rows = await db
    .select({ genreSlug: genres.slug, citySlug: cities.slug, count: sql<number>`count(distinct ${events.id})` })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .innerJoin(cities, eq(venues.cityId, cities.id))
    .innerJoin(eventArtists, and(eq(eventArtists.eventId, events.id), eq(eventArtists.role, "headliner")))
    .innerJoin(artistGenres, eq(artistGenres.artistId, eventArtists.artistId))
    .innerJoin(genres, eq(genres.id, artistGenres.genreId))
    .where(and(isNotNull(events.publishedAt), gte(events.startsAt, new Date())))
    .groupBy(genres.slug, cities.slug)
    .having(sql`count(distinct ${events.id}) >= 3`);

  return rows.map(({ genreSlug, citySlug }) => ({ genreSlug, citySlug }));
}

export async function getEventByShortId(shortId: string) {
  const [event] = await db
    .select({
      id: events.id,
      slug: events.slug,
      shortId: events.shortId,
      title: events.title,
      tourName: events.tourName,
      startsAt: events.startsAt,
      doorsAt: events.doorsAt,
      status: events.status,
      minPrice: events.minPrice,
      maxPrice: events.maxPrice,
      imageUrl: events.imageUrl,
      imageCredit: events.imageCredit,
      tags: events.tags,
      lastSeenAt: events.lastSeenAt,
      categorySlug: categories.slug,
      categoryNameHe: categories.nameHe,
      venueId: venues.id,
      venueName: venues.name,
      venueSlug: venues.slug,
      venueAddress: venues.address,
      venueLat: venues.lat,
      venueLng: venues.lng,
      cityNameHe: cities.nameHe,
      citySlug: cities.slug,
      artistId: artists.id,
      artistNameHe: artists.nameHe,
      artistSlug: artists.slug,
      artistImageUrl: artists.imageUrl,
      artistImageCredit: artists.imageCredit,
      genreSlug: primaryGenre.slug,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .innerJoin(cities, eq(venues.cityId, cities.id))
    .innerJoin(categories, eq(events.categoryId, categories.id))
    .innerJoin(eventArtists, and(eq(eventArtists.eventId, events.id), eq(eventArtists.role, "headliner")))
    .innerJoin(artists, eq(artists.id, eventArtists.artistId))
    .leftJoin(primaryArtistGenres, and(eq(primaryArtistGenres.artistId, artists.id), eq(primaryArtistGenres.isPrimary, true)))
    .leftJoin(primaryGenre, eq(primaryGenre.id, primaryArtistGenres.genreId))
    .where(and(eq(events.shortId, shortId), isNotNull(events.publishedAt)))
    .limit(1);

  return event ?? null;
}
