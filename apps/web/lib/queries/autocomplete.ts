import { sql } from "drizzle-orm";
import { normalizeHe, allGenres } from "@tiktim/shared";
import { db } from "@tiktim/db";
import { artists, cities, venues } from "@tiktim/db/schema";

export type AutocompleteSuggestion = {
  type: "artist" | "venue" | "city" | "genre";
  label: string;
  href: string;
};

export async function autocomplete(rawQuery: string, limit = 8): Promise<AutocompleteSuggestion[]> {
  const query = normalizeHe(rawQuery.trim());
  if (!query) return [];

  const likeQuery = `%${query}%`;

  const [artistRows, venueRows, cityRows] = await Promise.all([
    db
      .select({ slug: artists.slug, nameHe: artists.nameHe })
      .from(artists)
      .where(
        sql`${artists.nameNorm} ilike ${likeQuery} or ${artists.nameNorm} % ${query}
            or exists (select 1 from unnest(${artists.aliasesNorm}) alias where alias ilike ${likeQuery} or alias % ${query})`,
      )
      .orderBy(sql`similarity(${artists.nameNorm}, ${query}) desc`)
      .limit(limit),
    db
      .select({ slug: venues.slug, name: venues.name })
      .from(venues)
      .where(sql`${venues.nameNorm} ilike ${likeQuery} or ${venues.nameNorm} % ${query}`)
      .orderBy(sql`similarity(${venues.nameNorm}, ${query}) desc`)
      .limit(limit),
    db
      .select({ slug: cities.slug, nameHe: cities.nameHe })
      .from(cities)
      .where(sql`${cities.nameHe} ilike ${"%" + rawQuery.trim() + "%"}`)
      .limit(limit),
  ]);

  const genreMatches = allGenres
    .filter((g) => g.name_he.includes(rawQuery.trim()) || g.slug.includes(query))
    .slice(0, limit);

  const suggestions: AutocompleteSuggestion[] = [
    ...artistRows.map((a) => ({ type: "artist" as const, label: a.nameHe, href: `/artist/${a.slug}` })),
    ...venueRows.map((v) => ({ type: "venue" as const, label: v.name, href: `/venue/${v.slug}` })),
    ...cityRows.map((c) => ({ type: "city" as const, label: c.nameHe, href: `/city/${c.slug}` })),
    ...genreMatches.map((g) => ({ type: "genre" as const, label: g.name_he, href: `/music/${g.slug}` })),
  ];

  return suggestions.slice(0, limit);
}
