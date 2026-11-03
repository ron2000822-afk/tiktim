import { and, eq } from "drizzle-orm";
import { db } from "@tiktim/db";
import { artists, cities, emailSubscriptions, follows, genres, profiles, venues } from "@tiktim/db/schema";

export type FollowedItem = { targetType: "artist" | "genre" | "city" | "venue"; targetId: string; nameHe: string; href: string };

export async function getProfile(userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return profile ?? null;
}

export async function getEmailSubscriptionForUser(userId: string) {
  const [row] = await db.select().from(emailSubscriptions).where(eq(emailSubscriptions.userId, userId)).limit(1);
  return row ?? null;
}

export async function listFollowedItems(userId: string): Promise<FollowedItem[]> {
  const [followedArtists, followedGenres, followedCities, followedVenues] = await Promise.all([
    db
      .select({ targetId: follows.targetId, nameHe: artists.nameHe, slug: artists.slug })
      .from(follows)
      .innerJoin(artists, eq(artists.id, follows.targetId))
      .where(and(eq(follows.userId, userId), eq(follows.targetType, "artist"))),
    db
      .select({ targetId: follows.targetId, nameHe: genres.nameHe, slug: genres.slug })
      .from(follows)
      .innerJoin(genres, eq(genres.id, follows.targetId))
      .where(and(eq(follows.userId, userId), eq(follows.targetType, "genre"))),
    db
      .select({ targetId: follows.targetId, nameHe: cities.nameHe, slug: cities.slug })
      .from(follows)
      .innerJoin(cities, eq(cities.id, follows.targetId))
      .where(and(eq(follows.userId, userId), eq(follows.targetType, "city"))),
    db
      .select({ targetId: follows.targetId, nameHe: venues.name, slug: venues.slug })
      .from(follows)
      .innerJoin(venues, eq(venues.id, follows.targetId))
      .where(and(eq(follows.userId, userId), eq(follows.targetType, "venue"))),
  ]);

  return [
    ...followedArtists.map((a) => ({ targetType: "artist" as const, targetId: a.targetId, nameHe: a.nameHe, href: `/artist/${a.slug}` })),
    ...followedGenres.map((g) => ({ targetType: "genre" as const, targetId: g.targetId, nameHe: g.nameHe, href: `/music/${g.slug}` })),
    ...followedCities.map((c) => ({ targetType: "city" as const, targetId: c.targetId, nameHe: c.nameHe, href: `/city/${c.slug}` })),
    ...followedVenues.map((v) => ({ targetType: "venue" as const, targetId: v.targetId, nameHe: v.nameHe, href: `/venue/${v.slug}` })),
  ];
}
