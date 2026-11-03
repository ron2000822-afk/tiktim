import { asc, eq } from "drizzle-orm";
import { db } from "@tiktim/db";
import { categories, genres } from "@tiktim/db/schema";

export async function getGenreIdBySlug(slug: string): Promise<string | null> {
  const [row] = await db.select({ id: genres.id }).from(genres).where(eq(genres.slug, slug)).limit(1);
  return row?.id ?? null;
}

export async function listGenresForOnboarding() {
  return db
    .select({ id: genres.id, nameHe: genres.nameHe, categoryNameHe: categories.nameHe })
    .from(genres)
    .innerJoin(categories, eq(genres.categoryId, categories.id))
    .orderBy(asc(categories.sortOrder), asc(genres.sortOrder));
}
