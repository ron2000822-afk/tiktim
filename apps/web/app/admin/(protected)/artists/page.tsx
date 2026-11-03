import { connection } from "next/server";
import { and, asc, eq, ilike } from "drizzle-orm";
import { db } from "@tiktim/db";
import { artistGenres, artists, categories, genres } from "@tiktim/db/schema";
import { ADMIN_COPY } from "../../copy";
import { setArtistGenre } from "./actions";

export const instant = false;

export default async function AdminArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await connection();
  const { q } = await searchParams;

  const allGenres = await db
    .select({ id: genres.id, nameHe: genres.nameHe, categoryNameHe: categories.nameHe })
    .from(genres)
    .innerJoin(categories, eq(genres.categoryId, categories.id))
    .orderBy(asc(categories.sortOrder), asc(genres.sortOrder));

  const rows = await db
    .select({
      id: artists.id,
      nameHe: artists.nameHe,
      isInternational: artists.isInternational,
      primaryGenreId: genres.id,
    })
    .from(artists)
    .leftJoin(artistGenres, and(eq(artistGenres.artistId, artists.id), eq(artistGenres.isPrimary, true)))
    .leftJoin(genres, eq(artistGenres.genreId, genres.id))
    .where(q ? ilike(artists.nameHe, `%${q}%`) : undefined)
    .orderBy(asc(artists.nameHe))
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{ADMIN_COPY.artists.title}</h1>
      <form className="flex gap-2">
        <label className="sr-only" htmlFor="q">
          {ADMIN_COPY.artists.searchPlaceholder}
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q ?? ""}
          placeholder={ADMIN_COPY.artists.searchPlaceholder}
          className="w-full max-w-sm rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-[var(--radius-button)] border border-[var(--border)] px-4 py-2 text-sm">
          {ADMIN_COPY.artists.searchButton}
        </button>
      </form>
      <table className="w-full text-start text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
            <th className="px-2 py-2 text-start">{ADMIN_COPY.artists.columns.name}</th>
            <th className="px-2 py-2 text-start">{ADMIN_COPY.artists.columns.international}</th>
            <th className="px-2 py-2 text-start">{ADMIN_COPY.artists.columns.genre}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[var(--border)]">
              <td className="px-2 py-2">{row.nameHe}</td>
              <td className="px-2 py-2">{row.isInternational ? "✓" : ""}</td>
              <td className="px-2 py-2">
                <form action={setArtistGenre} className="flex items-center gap-2">
                  <input type="hidden" name="artistId" value={row.id} />
                  <label className="sr-only" htmlFor={`genre-${row.id}`}>
                    {ADMIN_COPY.artists.editGenre}
                  </label>
                  <select
                    id={`genre-${row.id}`}
                    name="genreId"
                    defaultValue={row.primaryGenreId ?? ""}
                    className="rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                  >
                    <option value="" disabled>
                      —
                    </option>
                    {allGenres.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.categoryNameHe} · {g.nameHe}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="text-[var(--accent)] underline">
                    {ADMIN_COPY.artists.save}
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="px-2 py-6 text-center text-[var(--text-muted)]">
                {ADMIN_COPY.artists.empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
