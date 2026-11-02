import { and, eq, sql } from "drizzle-orm";
import { db } from "@tiktim/db";
import { artistGenres, artists, follows, genres } from "@tiktim/db/schema";

export async function getArtistBySlug(slug: string) {
  const [artist] = await db.select().from(artists).where(eq(artists.slug, slug)).limit(1);
  if (!artist) return null;

  const artistGenreRows = await db
    .select({ slug: genres.slug, nameHe: genres.nameHe })
    .from(artistGenres)
    .innerJoin(genres, eq(genres.id, artistGenres.genreId))
    .where(eq(artistGenres.artistId, artist.id));

  const [{ count: followerCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(follows)
    .where(and(eq(follows.targetType, "artist"), eq(follows.targetId, artist.id)));

  return { ...artist, genres: artistGenreRows, followerCount: Number(followerCount) };
}

export async function listAllArtistSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return db.select({ slug: artists.slug, updatedAt: artists.updatedAt }).from(artists);
}
