import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@tiktim/db";
import { events, outboundClicks, searchQueries, sources } from "@tiktim/db/schema";

export async function listOutboundClicksByDay(days = 30) {
  const since = new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000);
  return db
    .select({ day: sql<string>`date_trunc('day', ${outboundClicks.createdAt})`, count: sql<number>`count(*)` })
    .from(outboundClicks)
    .where(gte(outboundClicks.createdAt, since))
    .groupBy(sql`date_trunc('day', ${outboundClicks.createdAt})`)
    .orderBy(sql`date_trunc('day', ${outboundClicks.createdAt})`);
}

export async function listOutboundClicksBySource(days = 30) {
  const since = new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000);
  return db
    .select({ sourceNameHe: sources.nameHe, count: sql<number>`count(*)` })
    .from(outboundClicks)
    .innerJoin(sources, eq(sources.id, outboundClicks.sourceId))
    .where(gte(outboundClicks.createdAt, since))
    .groupBy(sources.nameHe)
    .orderBy(desc(sql`count(*)`));
}

export async function listTopClickedEvents(days = 30, limit = 10) {
  const since = new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000);
  return db
    .select({ eventId: outboundClicks.eventId, title: events.title, count: sql<number>`count(*)` })
    .from(outboundClicks)
    .innerJoin(events, eq(events.id, outboundClicks.eventId))
    .where(gte(outboundClicks.createdAt, since))
    .groupBy(outboundClicks.eventId, events.title)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function listZeroResultSearches(days = 30, limit = 30) {
  const since = new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000);
  return db
    .select({ query: searchQueries.query, filters: searchQueries.filters, count: sql<number>`count(*)` })
    .from(searchQueries)
    .where(and(gte(searchQueries.createdAt, since), eq(searchQueries.resultCount, 0), sql`${searchQueries.query} is not null`))
    .groupBy(searchQueries.query, searchQueries.filters)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}
