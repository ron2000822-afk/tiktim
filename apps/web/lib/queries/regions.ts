import { db } from "@tiktim/db";
import { regions } from "@tiktim/db/schema";

export async function listRegions() {
  return db
    .select({ id: regions.id, slug: regions.slug, nameHe: regions.nameHe })
    .from(regions)
    .orderBy(regions.sortOrder);
}
