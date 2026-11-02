import type { Metadata } from "next";
import { desc, eq, ilike } from "drizzle-orm";
import { db } from "@tiktim/db";
import { events, venues, cities } from "@tiktim/db/schema";
import { allGenres } from "@tiktim/shared";
import { ADMIN_COPY } from "../../../copy";
import { PromotionForm } from "./PromotionForm";
import { EventSearchForm } from "./EventSearchForm";

export const metadata: Metadata = { title: ADMIN_COPY.promotions.form.title };
export const instant = false;

export default async function NewPromotionPage({ searchParams }: { searchParams: Promise<{ q?: string; eventId?: string }> }) {
  const { q, eventId } = await searchParams;

  if (eventId) {
    const [event] = await db
      .select({ id: events.id, title: events.title, venueName: venues.name, cityNameHe: cities.nameHe, startsAt: events.startsAt })
      .from(events)
      .innerJoin(venues, eq(events.venueId, venues.id))
      .innerJoin(cities, eq(venues.cityId, cities.id))
      .where(eq(events.id, eventId))
      .limit(1);

    if (event) {
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">{ADMIN_COPY.promotions.form.title}</h1>
          <PromotionForm event={event} genres={allGenres} />
        </div>
      );
    }
  }

  const results = q
    ? await db
        .select({ id: events.id, title: events.title, venueName: venues.name, cityNameHe: cities.nameHe, startsAt: events.startsAt })
        .from(events)
        .innerJoin(venues, eq(events.venueId, venues.id))
        .innerJoin(cities, eq(venues.cityId, cities.id))
        .where(ilike(events.title, `%${q}%`))
        .orderBy(desc(events.startsAt))
        .limit(20)
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{ADMIN_COPY.promotions.form.title}</h1>
      <EventSearchForm defaultValue={q ?? ""} />
      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div>
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {e.venueName}, {e.cityNameHe} · {new Intl.DateTimeFormat("he-IL", { dateStyle: "short" }).format(e.startsAt)}
                </p>
              </div>
              <a
                href={`/admin/promotions/new?eventId=${e.id}`}
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
              >
                {ADMIN_COPY.promotions.selectEvent}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
