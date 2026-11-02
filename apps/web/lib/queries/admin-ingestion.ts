import { desc, eq } from "drizzle-orm";
import { db } from "@tiktim/db";
import { ingestionRuns, sources } from "@tiktim/db/schema";

export type SourceWithLastRun = {
  source: typeof sources.$inferSelect;
  lastRun: typeof ingestionRuns.$inferSelect | null;
  previousRun: typeof ingestionRuns.$inferSelect | null;
};

export async function listSourcesWithLastRun(): Promise<SourceWithLastRun[]> {
  const allSources = await db.select().from(sources).orderBy(sources.slug);

  const results: SourceWithLastRun[] = [];
  for (const source of allSources) {
    const lastTwoRuns = await db
      .select()
      .from(ingestionRuns)
      .where(eq(ingestionRuns.sourceId, source.id))
      .orderBy(desc(ingestionRuns.startedAt))
      .limit(2);
    results.push({ source, lastRun: lastTwoRuns[0] ?? null, previousRun: lastTwoRuns[1] ?? null });
  }
  return results;
}
