import { sql } from "drizzle-orm";
import { normalizeHe, slugify } from "@tiktim/shared";
import { db } from "@tiktim/db";
import { cities, venues } from "@tiktim/db/schema";

const VENUE_SIMILARITY_THRESHOLD = 0.6;

export async function resolveCity(rawCityName: string | undefined): Promise<string | null> {
  if (!rawCityName) return null;
  const name = rawCityName.trim();
  if (!name) return null;

  const [exact] = await db
    .select({ id: cities.id })
    .from(cities)
    .where(sql`${cities.nameHe} ilike ${name} or ${cities.nameEn} ilike ${name} or ${name} = any(${cities.aliases})`)
    .limit(1);
  if (exact) return exact.id;

  const [fuzzy] = await db
    .select({ id: cities.id })
    .from(cities)
    .where(sql`${cities.nameHe} ilike ${"%" + name + "%"}`)
    .limit(1);
  return fuzzy?.id ?? null;
}

export type VenueResolution = { kind: "matched"; venueId: string } | { kind: "unmatched" };

export async function resolveVenue(rawVenueName: string, cityId: string | null): Promise<VenueResolution> {
  const nameNorm = normalizeHe(rawVenueName);

  const [exactAlias] = await db
    .select({ id: venues.id })
    .from(venues)
    .where(sql`${venues.nameNorm} = ${nameNorm} or ${nameNorm} = any(${venues.aliasesNorm})`)
    .limit(1);
  if (exactAlias) return { kind: "matched", venueId: exactAlias.id };

  if (!cityId) return { kind: "unmatched" };

  const fuzzy = await db.execute<{ id: string; score: number }>(sql`
    select id, similarity(name_norm, ${nameNorm}) as score
    from venues
    where city_id = ${cityId} and name_norm % ${nameNorm}
    order by score desc
    limit 1
  `);

  const best = fuzzy[0];
  if (best && Number(best.score) >= VENUE_SIMILARITY_THRESHOLD) {
    return { kind: "matched", venueId: best.id };
  }
  return { kind: "unmatched" };
}

export async function createUnverifiedVenue(rawName: string, cityId: string): Promise<string> {
  const baseSlug = slugify(rawName) || "venue";
  const [created] = await db
    .insert(venues)
    .values({
      slug: `${baseSlug}-${Date.now().toString(36)}`,
      name: rawName,
      nameNorm: normalizeHe(rawName),
      cityId,
      venueType: "other",
    })
    .returning({ id: venues.id });
  return created.id;
}
