import { desc, eq, ilike } from "drizzle-orm";
import { db } from "@tiktim/db";
import { events, venues, cities } from "@tiktim/db/schema";
import { ADMIN_COPY } from "../../copy";
import { toggleFeatured } from "./actions";

export const instant = false;

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      status: events.status,
      isFeatured: events.isFeatured,
      venueName: venues.name,
      cityName: cities.nameHe,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .innerJoin(cities, eq(venues.cityId, cities.id))
    .where(q ? ilike(events.title, `%${q}%`) : undefined)
    .orderBy(desc(events.startsAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{ADMIN_COPY.events.title}</h1>
      <form className="flex gap-2">
        <label className="sr-only" htmlFor="q">
          {ADMIN_COPY.events.searchPlaceholder}
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q ?? ""}
          placeholder={ADMIN_COPY.events.searchPlaceholder}
          className="w-full max-w-sm rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-[var(--radius-button)] border border-[var(--border)] px-4 py-2 text-sm">
          {ADMIN_COPY.events.searchButton}
        </button>
      </form>
      <table className="w-full text-start text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
            <th className="px-2 py-2 text-start">{ADMIN_COPY.events.columns.title}</th>
            <th className="px-2 py-2 text-start">{ADMIN_COPY.events.columns.venue}</th>
            <th className="px-2 py-2 text-start">{ADMIN_COPY.events.columns.city}</th>
            <th className="px-2 py-2 text-start">{ADMIN_COPY.events.columns.date}</th>
            <th className="px-2 py-2 text-start">{ADMIN_COPY.events.columns.status}</th>
            <th className="px-2 py-2 text-start">{ADMIN_COPY.events.columns.featured}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[var(--border)]">
              <td className="px-2 py-2">{row.title}</td>
              <td className="px-2 py-2">{row.venueName}</td>
              <td className="px-2 py-2">{row.cityName}</td>
              <td className="px-2 py-2">
                {new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(row.startsAt)}
              </td>
              <td className="px-2 py-2">{row.status}</td>
              <td className="px-2 py-2">
                <form action={toggleFeatured.bind(null, row.id, !row.isFeatured)}>
                  <button type="submit" className="text-[var(--accent)] underline">
                    {row.isFeatured ? ADMIN_COPY.events.featureOff : ADMIN_COPY.events.featureOn}
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-2 py-6 text-center text-[var(--text-muted)]">
                {ADMIN_COPY.events.empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
