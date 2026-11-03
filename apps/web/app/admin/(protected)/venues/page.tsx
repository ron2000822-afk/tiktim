import { connection } from "next/server";
import { asc, eq, ilike } from "drizzle-orm";
import { db } from "@tiktim/db";
import { cities, venues } from "@tiktim/db/schema";
import { ADMIN_COPY } from "../../copy";

export const instant = false;

export default async function AdminVenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await connection();
  const { q } = await searchParams;

  const rows = await db
    .select({
      id: venues.id,
      name: venues.name,
      venueType: venues.venueType,
      cityName: cities.nameHe,
    })
    .from(venues)
    .innerJoin(cities, eq(venues.cityId, cities.id))
    .where(q ? ilike(venues.name, `%${q}%`) : undefined)
    .orderBy(asc(venues.name))
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{ADMIN_COPY.venues.title}</h1>
      <form className="flex gap-2">
        <label className="sr-only" htmlFor="q">
          {ADMIN_COPY.venues.searchPlaceholder}
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q ?? ""}
          placeholder={ADMIN_COPY.venues.searchPlaceholder}
          className="w-full max-w-sm rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-[var(--radius-button)] border border-[var(--border)] px-4 py-2 text-sm">
          {ADMIN_COPY.venues.searchButton}
        </button>
      </form>
      <table className="w-full text-start text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
            <th className="px-2 py-2 text-start">{ADMIN_COPY.venues.columns.name}</th>
            <th className="px-2 py-2 text-start">{ADMIN_COPY.venues.columns.city}</th>
            <th className="px-2 py-2 text-start">{ADMIN_COPY.venues.columns.type}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[var(--border)]">
              <td className="px-2 py-2">{row.name}</td>
              <td className="px-2 py-2">{row.cityName}</td>
              <td className="px-2 py-2">{row.venueType}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="px-2 py-6 text-center text-[var(--text-muted)]">
                {ADMIN_COPY.venues.empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
