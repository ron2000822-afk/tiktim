import { eq } from "drizzle-orm";
import { db } from "@tiktim/db";
import { cities, venues } from "@tiktim/db/schema";

export async function getVenueBySlug(slug: string) {
  const [venue] = await db
    .select({
      id: venues.id,
      slug: venues.slug,
      name: venues.name,
      address: venues.address,
      lat: venues.lat,
      lng: venues.lng,
      capacity: venues.capacity,
      venueType: venues.venueType,
      isOutdoor: venues.isOutdoor,
      accessibilityNotes: venues.accessibilityNotes,
      website: venues.website,
      cityNameHe: cities.nameHe,
      citySlug: cities.slug,
    })
    .from(venues)
    .innerJoin(cities, eq(venues.cityId, cities.id))
    .where(eq(venues.slug, slug))
    .limit(1);
  return venue ?? null;
}

export async function listCities() {
  return db
    .select({ id: cities.id, slug: cities.slug, nameHe: cities.nameHe })
    .from(cities)
    .orderBy(cities.nameHe);
}

export async function listAllVenueSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return db.select({ slug: venues.slug, updatedAt: venues.updatedAt }).from(venues);
}
