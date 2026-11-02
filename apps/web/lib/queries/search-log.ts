import { db } from "@tiktim/db";
import { searchQueries } from "@tiktim/db/schema";

export async function logSearchQuery(query: string | undefined, filters: Record<string, unknown>, resultCount: number) {
  await db.insert(searchQueries).values({ query: query || null, filters, resultCount });
}
